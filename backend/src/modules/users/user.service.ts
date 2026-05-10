import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Gender } from './entities/user.entity';
import { CreateProfileDto, UpdateProfileDto } from './dto/create-profile.dto';
import { UserProfileDto } from './dto/user.dto';
import { RedisService } from '../../common/redis.service';
import { CacheService } from '../../common/cache.service';
import { S3Service } from '../../common/s3.service';

export interface ProfileCompletion {
  steps: Record<string, boolean>;
  percentage: number;
  isComplete: boolean;
  nextStep: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private redis: RedisService,
    private cache: CacheService,
    private s3Service: S3Service,
  ) {}

  async createProfile(userId: string, dto: CreateProfileDto): Promise<UserProfileDto> {
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
      user.location = `POINT(${Number(dto.location.lng)} ${Number(dto.location.lat)})`;
      // Also cache in Redis for fast geo queries
      await this.redis.geoAdd(
        'user:locations',
        dto.location.lng,
        dto.location.lat,
        userId,
      );
    }

    user.isVisible = dto.isVisible ?? true;

    await this.usersRepo.save(user);

    // Invalidate cache
    await this.cache.delete(`user:profile:${userId}`);

    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfileDto> {
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

    // Crucial: preserve completedAt when updating profile
    if (user.profile?.completedAt) {
      profileUpdate.completedAt = user.profile.completedAt;
    }

    user.profile = {
      ...user.profile,
      ...profileUpdate,
    };

    if (dto.displayName) user.displayName = dto.displayName;
    if (dto.isVisible !== undefined) user.isVisible = dto.isVisible;

    if (dto.location) {
      user.location = `POINT(${Number(dto.location.lng)} ${Number(dto.location.lat)})`;
      await this.redis.geoAdd(
        'user:locations',
        dto.location.lng,
        dto.location.lat,
        userId,
      );
    }

    await this.usersRepo.save(user);
    await this.cache.delete(`user:profile:${userId}`);

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
      const oldKey = this.s3Service.extractKey(photos[position]);
      if (oldKey && oldKey.startsWith(`profiles/${userId}/`)) {
        try {
          await this.s3Service.delete(oldKey);
        } catch (e) {
          console.error('Failed to delete old photo:', e);
        }
      }
      photos[position] = url;
    } else {
      photos.push(url);
    }

    // Set avatarUrl to first photo if it's position 0
    if (position === 0) {
      user.avatarUrl = url;
    }

    user.profile = { ...user.profile, photoUrls: photos };
    await this.usersRepo.save(user);
    await this.cache.delete(`user:profile:${userId}`);

    return { url, position };
  }

  async deleteProfilePhoto(userId: string, position: number): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const photos = user.profile?.photoUrls || [];
    if (position >= photos.length) {
      throw new BadRequestException('Invalid photo position');
    }

    const url = photos[position];
    const key = this.s3Service.extractKey(url);

    if (key && key.startsWith(`profiles/${userId}/`)) {
      try {
        await this.s3Service.delete(key);
      } catch (e) {
        console.error('Failed to delete photo from S3:', e);
      }
    }

    photos.splice(position, 1);
    user.profile = { ...user.profile, photoUrls: photos };

    if (position === 0) {
      user.avatarUrl = photos[0] || null;
    }

    await this.usersRepo.save(user);
    await this.cache.delete(`user:profile:${userId}`);
  }

  async getProfile(userId: string): Promise<UserProfileDto> {
    const cached = await this.cache.get<UserProfileDto>(`user:profile:${userId}`);
    if (cached) return cached;

    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const sanitized = this.sanitizeUser(user);
    await this.cache.set(`user:profile:${userId}`, sanitized, 300);

    return sanitized;
  }

  async getPublicProfile(userId: string): Promise<UserProfileDto> {
    // Similar to getProfile, but might omit certain private fields in the future
    return this.getProfile(userId);
  }

  async setVisibility(userId: string, isVisible: boolean): Promise<{ isVisible: boolean }> {
    await this.usersRepo.update(userId, { isVisible });
    await this.cache.delete(`user:profile:${userId}`);
    return { isVisible };
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Soft delete: deactivate the account rather than hard-deleting rows
    await this.usersRepo.update(userId, { isActive: false, isVisible: false });

    // Remove from real-time geo index so the user disappears from the map
    await this.redis.geoRemove('user:locations', userId);
    await this.cache.delete(`user:profile:${userId}`);
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

  private sanitizeUser(user: User): UserProfileDto {
    return {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      createdAt: user.createdAt,
      bio: user.profile?.bio,
      age: user.profile?.age,
      gender: user.profile?.gender,
      interestedIn: user.profile?.interestedIn,
      interests: user.profile?.interests,
      datingScore: user.datingScore,
      socialScore: user.socialScore,
      traderScore: user.traderScore,
      overallLevel: user.overallLevel,
      verificationScore: user.verificationScore,
      badges: user.badges,
      completedAt: user.profile?.completedAt,
    };
  }
}
