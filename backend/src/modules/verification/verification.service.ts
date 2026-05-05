// backend/src/modules/verification/verification.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import { Repository, Not, MoreThan } from 'typeorm';
import { Verification, VerificationType, VerificationStatus } from '../users/entities/verification.entity';
import { User } from '../users/entities/user.entity';
import { TwilioService } from '../../common/twilio.service';
import { S3Service } from '../../common/s3.service';
import { FaceCompareService } from '../../common/face-compare.service';
import { EmailService } from '../../common/email.service';

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(Verification)
    private verificationRepo: Repository<Verification>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private twilioService: TwilioService,
    private emailService: EmailService,
    private s3Service: S3Service,
    private faceCompare: FaceCompareService,
  ) {}

 // ─── Email Verification ───────────────────────────────────────────────

  async sendEmailCode(userId: string, email: string): Promise<{ expiresIn: number }> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Check if email already verified by another user
    const existingUser = await this.usersRepo.findOne({
      where: { email, id: Not(userId) }
    });
    if (existingUser?.badges?.email) {
      throw new BadRequestException('Email already verified by another account');
    }

    // Rate limiting: max 5 attempts per hour
    const recentAttempts = await this.verificationRepo.count({
      where: {
        user: { id: userId },
        type: VerificationType.EMAIL,
        createdAt: MoreThan(new Date(Date.now() - 3600000)),
      },
    });

    if (recentAttempts >= 5) {
      throw new BadRequestException('Too many attempts. Try again in 1 hour.');
    }

    // Generate cryptographically secure 6-digit code
    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 600000); // 10 minutes

    // Send email
    await this.emailService.sendVerificationEmail(email, code, user.displayName);

    // Store verification record
    await this.verificationRepo.save({
      user,
      type: VerificationType.EMAIL,
      status: VerificationStatus.PENDING,
      metadata: {
        email,
        code: await this.hashCode(code),
        codeExpiresAt: expiresAt.toISOString(),
        attempts: 0,
      },
    });

    return { expiresIn: 600 };
  }

  async verifyEmailCode(userId: string, code: string): Promise<{ verified: boolean }> {
    const verification = await this.verificationRepo.findOne({
      where: {
        user: { id: userId },
        type: VerificationType.EMAIL,
        status: VerificationStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });

    if (!verification) {
      throw new BadRequestException('No pending email verification found');
    }

    // Check expiry
    if (verification.metadata.codeExpiresAt && new Date(verification.metadata.codeExpiresAt) < new Date()) {
      verification.status = VerificationStatus.EXPIRED;
      await this.verificationRepo.save(verification);
      throw new BadRequestException('Code expired. Request a new one.');
    }

    // Check attempts
    if ((verification.metadata.attempts ?? 0) >= 5) {
      throw new BadRequestException('Too many failed attempts. Request a new code.');
    }

    // Verify code
    if (!verification.metadata.code) {
      throw new BadRequestException('Invalid verification state');
    }
    const isValid = await this.compareCode(code, verification.metadata.code);

    if (!isValid) {
      verification.metadata.attempts = (verification.metadata.attempts ?? 0) + 1;
      await this.verificationRepo.save(verification);
      throw new BadRequestException('Invalid code');
    }

    // Success - update verification
    verification.status = VerificationStatus.APPROVED;
    verification.verifiedAt = new Date();
    await this.verificationRepo.save(verification);

    // Update user email if different
    const user = verification.user;
    if (verification.metadata.email && user.email !== verification.metadata.email) {
      user.email = verification.metadata.email;
      await this.usersRepo.save(user);
    }

    // Update badges
    await this.updateUserBadges(userId, 'email', true);

    // Send welcome email
    if (verification.metadata.email) {
      await this.emailService.sendWelcomeEmail(
        verification.metadata.email,
        user.displayName,
      );
    }

    return { verified: true };
  }

  async resendEmailCode(userId: string): Promise<{ expiresIn: number }> {
    const lastVerification = await this.verificationRepo.findOne({
      where: {
        user: { id: userId },
        type: VerificationType.EMAIL,
      },
      order: { createdAt: 'DESC' },
    });

    if (!lastVerification?.metadata?.email) {
      throw new BadRequestException('No email verification in progress');
    }

    return this.sendEmailCode(userId, lastVerification.metadata.email);
  }

  // ─── Phone Verification ───────────────────────────────────────────────

  async sendPhoneCode(userId: string, phone: string): Promise<{ expiresIn: number }> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Check rate limiting (max 3 attempts per hour)
    const recentAttempts = await this.verificationRepo.count({
      where: {
        user: { id: userId },
        type: VerificationType.PHONE,
        createdAt: MoreThan(new Date(Date.now() - 3600000)),
      },
    });

    if (recentAttempts >= 3) {
      throw new BadRequestException('Too many attempts. Try again in 1 hour.');
    }

    // Generate cryptographically secure 6-digit code
    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 600000); // 10 minutes

    // Send SMS via Twilio
    await this.twilioService.sendSMS(phone, `Your G88 verification code: ${code}`);

    // Store verification record
    await this.verificationRepo.save({
      user,
      type: VerificationType.PHONE,
      status: VerificationStatus.PENDING,
      metadata: {
        code: await this.hashCode(code),
        codeExpiresAt: expiresAt.toISOString(),
        attempts: 0,
      },
    });

    return { expiresIn: 600 };
  }

  async verifyPhoneCode(userId: string, code: string): Promise<{ verified: boolean }> {
    const verification = await this.verificationRepo.findOne({
      where: {
        user: { id: userId },
        type: VerificationType.PHONE,
        status: VerificationStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    if (!verification) {
      throw new BadRequestException('No pending verification found');
    }

    // Check expiry
    if (verification.metadata.codeExpiresAt && new Date(verification.metadata.codeExpiresAt) < new Date()) {
      verification.status = VerificationStatus.EXPIRED;
      await this.verificationRepo.save(verification);
      throw new BadRequestException('Code expired. Request a new one.');
    }

    // Check attempts
    if ((verification.metadata.attempts ?? 0) >= 5) {
      throw new BadRequestException('Too many failed attempts. Request a new code.');
    }

    // Verify code
    if (!verification.metadata.code) {
      throw new BadRequestException('Invalid verification state');
    }
    const isValid = await this.compareCode(code, verification.metadata.code);

    if (!isValid) {
      verification.metadata.attempts = (verification.metadata.attempts ?? 0) + 1;
      await this.verificationRepo.save(verification);
      throw new BadRequestException('Invalid code');
    }

    // Success
    verification.status = VerificationStatus.APPROVED;
    verification.verifiedAt = new Date();
    await this.verificationRepo.save(verification);

    // Update user badges
    await this.updateUserBadges(userId, 'phone', true);

    return { verified: true };
  }

  // ─── Photo Verification (Selfie Match) ────────────────────────────────

  async initiatePhotoVerification(userId: string): Promise<{ challenge: string }> {
    // Generate random pose challenge
    const challenges = ['smile', 'turn_left', 'turn_right', 'thumbs_up', 'peace_sign'];
    const challenge = challenges[Math.floor(Math.random() * challenges.length)];

    await this.verificationRepo.save({
      user: { id: userId },
      type: VerificationType.PHOTO,
      status: VerificationStatus.PENDING,
      metadata: { challenge },
    });

    return { challenge };
  }

  async submitPhotoVerification(
    userId: string,
    selfieFile: Express.Multer.File,
  ): Promise<{ status: VerificationStatus; message: string }> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user?.profile?.photoUrls?.length) {
      throw new BadRequestException('Upload profile photos first');
    }

    const verification = await this.verificationRepo.findOne({
      where: {
        user: { id: userId },
        type: VerificationType.PHOTO,
        status: VerificationStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    if (!verification) {
      throw new BadRequestException('No pending photo verification');
    }

    // Upload selfie
    const selfieKey = `verifications/${userId}/selfie-${Date.now()}.jpg`;
    const selfieUrl = await this.s3Service.upload(selfieFile.buffer, selfieKey);

    // Compare with profile photos using face recognition
    const profilePhotoUrl = user.profile.photoUrls[0];
    const matchResult = await this.faceCompare.compare(profilePhotoUrl, selfieUrl);

    if (matchResult.confidence >= 0.85) {
      verification.status = VerificationStatus.APPROVED;
      verification.verifiedAt = new Date();
      verification.metadata.selfieUrl = selfieUrl;
      await this.verificationRepo.save(verification);
      await this.updateUserBadges(userId, 'photo', true);

      return { status: VerificationStatus.APPROVED, message: 'Photo verified!' };
    } else if (matchResult.confidence >= 0.6) {
      // Manual review needed
      verification.metadata.selfieUrl = selfieUrl;
      await this.verificationRepo.save(verification);

      return { status: VerificationStatus.PENDING, message: 'Submitted for manual review' };
    } else {
      verification.status = VerificationStatus.REJECTED;
      verification.metadata.rejectionReason = 'Face mismatch';
      await this.verificationRepo.save(verification);

      return { status: VerificationStatus.REJECTED, message: 'Face does not match profile photos' };
    }
  }

  // ─── ID Verification ──────────────────────────────────────────────────

  async submitIdVerification(
    userId: string,
    idFrontFile: Express.Multer.File,
    idBackFile?: Express.Multer.File,
  ): Promise<{ status: VerificationStatus }> {
    const frontKey = `verifications/${userId}/id-front-${Date.now()}.jpg`;
    const frontUrl = await this.s3Service.upload(idFrontFile.buffer, frontKey);

    let backUrl: string | undefined;
    if (idBackFile) {
      const backKey = `verifications/${userId}/id-back-${Date.now()}.jpg`;
      backUrl = await this.s3Service.upload(idBackFile.buffer, backKey);
    }

    // Queue for manual review (or integrate with ID verification API like Jumio/Onfido)
    await this.verificationRepo.save({
      user: { id: userId },
      type: VerificationType.ID,
      status: VerificationStatus.PENDING,
      metadata: {
        idDocumentUrl: frontUrl,
        idBackUrl: backUrl,
      },
    });

    return { status: VerificationStatus.PENDING };
  }

  // ─── Badge Management ─────────────────────────────────────────────────

  private async updateUserBadges(
    userId: string,
    badge: keyof User['badges'],
    value: boolean,
  ): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.badges = { ...user.badges, [badge]: value };

    // Calculate verification score
    const badgeWeights: Record<keyof User['badges'], number> = { phone: 20, email: 15, photo: 35, id: 25, premium: 5, social: 0 };
    let score = 0;
    for (const key of Object.keys(badgeWeights) as Array<keyof User['badges']>) {
      if (user.badges[key]) score += badgeWeights[key];
    }
    user.verificationScore = score;

    await this.usersRepo.save(user);
  }

  async getVerificationStatus(userId: string): Promise<{
    badges: User['badges'];
    score: number;
    pending: VerificationType[];
  }> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const pendingVerifications = await this.verificationRepo.find({
      where: {
        user: { id: userId },
        status: VerificationStatus.PENDING,
      },
    });

    return {
      badges: user.badges,
      score: user.verificationScore,
      pending: pendingVerifications.map((v) => v.type),
    };
  }

  private async hashCode(code: string): Promise<string> {
    const bcrypt = await import('bcrypt');
    return bcrypt.hash(code, 10);
  }

  private async compareCode(code: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(code, hash);
  }
}
