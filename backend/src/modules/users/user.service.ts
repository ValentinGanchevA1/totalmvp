// backend/src/modules/users/users.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Gender } from './entities/user.entity';
import { S3Service } from '../../common/s3.service';
import { RedisService } from '../../common/redis.service';
import { CreateProfileDto, UpdateProfileDto, Gender as DtoGender } from './dto/create-profile.dto';

export interface ProfileCompletion {
  steps: {
    basicInfo: boolean;
    bio: boolean;
    photos: boolean;
    interests: boolean;
    location: boolean;
    goals: boolean;
  };
  percentage: number;
  isComplete: boolean;
  nextStep: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private s3Service: S3Service,
    private redis: RedisService,
  ) {}

  async createProfile(userId: string, dto: CreateProfileDto): Promise<Partial<User>> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Validate age (must be 18+)
    if (dto.age < 18) {
      throw new BadRequestException('Must be 18 or older');
    }

    // Build profile object
    user.displayName = dto.displayName;
    user.profile = {
      bio: dto.bio || '',
      age: dto.age,
      gender: dto.gender as unknown as Gender,
      interestedIn: dto.interestedIn as unknown as Gender | undefined,
      interests: dto.interests,
      goals: dto.goals as unknown as string[],
      photoUrls: dto.photoUrls || [],
      completedAt: new Date().toISOString(),
    };

    // Set location if provided
    if (dto.location) {
      user.location = `POINT(${dto.location.lng} ${dto.location.lat})`;
      // Also cache in Redis for fast geo queries
      await this.redis.geoAdd(
        'user:locations',
        dto.location.lng,
        dto.location.lat,
        userId,
      );
    }

    user.isVisible = dto.isVisible ?? true;
    // user.profileCompletedAt = new Date(); // Removed as it's not in entity

    await this.usersRepo.save(user);

    // Invalidate any cached profile
    await this.redis.del(`user:profile:${userId}`);

    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<Partial<User>> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Merge profile updates
    const profileUpdate: Partial<User['profile']> = {};
    if (dto.bio !== undefined) profileUpdate.bio = dto.bio;
    if (dto.age !== undefined) profileUpdate.age = dto.age;
    if (dto.gender !== undefined) profileUpdate.gender = dto.gender as unknown as Gender;
    if (dto.interestedIn !== undefined) profileUpdate.interestedIn = dto.interestedIn as unknown as Gender;
    if (dto.interests !== undefined) profileUpdate.interests = dto.interests;
    if (dto.goals !== undefined) profileUpdate.goals = dto.goals as unknown as string[];
    if (dto.photoUrls !== undefined) profileUpdate.photoUrls = dto.photoUrls;

    user.profile = {
      ...user.profile,
      ...profileUpdate,
    };

    if (dto.displayName) user.displayName = dto.displayName;
    if (dto.isVisible !== undefined) user.isVisible = dto.isVisible;

    if (dto.location) {
      user.location = `POINT(${dto.location.lng} ${dto.location.lat})`;
      await this.redis.geoAdd(
        'user:locations',
        dto.location.lng,
        dto.location.lat,
        userId,
      );
    }

    await this.usersRepo.save(user);
    await this.redis.del(`user:profile:${userId}`);

    return this.sanitizeUser(user);
  }

  async uploadProfilePhoto(
    userId: string,
    file: Express.Multer.File,
    position: number,
  ): Promise<{ url: string; position: number }> {
    // Validate file
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Use JPEG, PNG, or WebP');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File too large. Max 10MB');
    }

    // Upload to S3
    const key = `profiles/${userId}/${Date.now()}-${position}.jpg`;
    const url = await this.s3Service.upload(file.buffer, key, file.mimetype);

    // Update user's photo array
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const photos = user.profile?.photoUrls || [];

    // Replace or add at position
    if (position < photos.length) {
      // Delete old photo from S3
      await this.s3Service.delete(photos[position]);
      photos[position] = url;
    } else {
      photos.push(url);
    }

    user.profile = { ...user.profile, photoUrls: photos };

    // Set first photo as avatar
    if (position === 0 || !user.avatarUrl) {
      user.avatarUrl = url;
    }

    await this.usersRepo.save(user);

    return { url, position };
  }

  async deleteProfilePhoto(userId: string, position: number): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const photos = user.profile?.photoUrls || [];

    if (position >= photos.length) {
      throw new BadRequestException('Photo not found');
    }

    // Delete from S3
    await this.s3Service.delete(photos[position]);

    // Remove from array
    photos.splice(position, 1);
    user.profile = { ...user.profile, photoUrls: photos };

    // Update avatar if needed
    if (position === 0) {
      user.avatarUrl = photos[0] ?? undefined;
    }

    await this.usersRepo.save(user);
  }

  async getProfile(userId: string): Promise<Partial<User>> {
    // Check cache first
    const cached = await this.redis.get(`user:profile:${userId}`);
    if (cached) return JSON.parse(cached);

    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const sanitized = this.sanitizeUser(user);

    // Cache for 5 minutes
    await this.redis.set(`user:profile:${userId}`, JSON.stringify(sanitized), 300);

    return sanitized;
  }

  async getProfileCompletionStatus(userId: string): Promise<ProfileCompletion> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const steps = {
      basicInfo: !!(user.displayName && user.profile?.age && user.profile?.gender),
      bio: !!((user.profile?.bio?.length ?? 0) > 10),
      photos: !!((user.profile?.photoUrls?.length ?? 0) >= 1),
      interests: !!((user.profile?.interests?.length ?? 0) >= 3),
      location: !!user.location,
      goals: !!((user.profile?.goals?.length ?? 0) >= 1),
    };

    const completed = Object.values(steps).filter(Boolean).length;
    const total = Object.keys(steps).length;

    return {
      steps,
      percentage: Math.round((completed / total) * 100),
      isComplete: completed === total,
      nextStep: Object.entries(steps).find(([_, done]) => !done)?.[0] || null,
    };
  }

  async getPublicProfile(userId: string): Promise<Partial<User>> {
      const user = await this.usersRepo.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      return this.sanitizeUser(user);
  }

  private sanitizeUser(user: User): Partial<User> {
    const { passwordHash, stripeCustomerId, ...safe } = user;
    return safe;
  }
}
