import {
  Injectable,
  ConflictException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Wave } from './entities/wave.entity';
import { User } from '../users/entities/user.entity';

const WAVE_COOLDOWN_HOURS = 24;

export interface WaveNotification {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  createdAt: Date;
}

@Injectable()
export class InteractionsService {
  constructor(
    @InjectRepository(Wave)
    private waveRepository: Repository<Wave>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async canSendWave(fromUserId: string, toUserId: string): Promise<{ canSend: boolean; remainingSeconds?: number }> {
    const cooldownTime = new Date();
    cooldownTime.setHours(cooldownTime.getHours() - WAVE_COOLDOWN_HOURS);

    const existingWave = await this.waveRepository.findOne({
      where: {
        fromUserId,
        toUserId,
        createdAt: MoreThan(cooldownTime),
      },
      order: { createdAt: 'DESC' },
    });

    if (existingWave) {
      const nextWaveTime = new Date(existingWave.createdAt);
      nextWaveTime.setHours(nextWaveTime.getHours() + WAVE_COOLDOWN_HOURS);
      const remainingSeconds = Math.ceil((nextWaveTime.getTime() - Date.now()) / 1000);
      return { canSend: false, remainingSeconds };
    }

    return { canSend: true };
  }

  async sendWave(fromUserId: string, toUserId: string): Promise<{ wave: Wave; notification: WaveNotification }> {
    // Check if target user exists
    const toUser = await this.userRepository.findOne({ where: { id: toUserId } });
    if (!toUser) {
      throw new NotFoundException('User not found');
    }

    // Check cooldown
    const cooldownCheck = await this.canSendWave(fromUserId, toUserId);
    if (!cooldownCheck.canSend) {
      const hours = Math.floor(cooldownCheck.remainingSeconds! / 3600);
      const minutes = Math.floor((cooldownCheck.remainingSeconds! % 3600) / 60);
      throw new ConflictException({
        message: `You already waved to this user. Try again in ${hours}h ${minutes}m.`,
        remainingSeconds: cooldownCheck.remainingSeconds,
      });
    }

    // Get sender info for notification
    const fromUser = await this.userRepository.findOne({ where: { id: fromUserId } });

    // Create wave
    const wave = this.waveRepository.create({
      fromUserId,
      toUserId,
    });
    await this.waveRepository.save(wave);

    // Create notification payload
    const notification: WaveNotification = {
      id: wave.id,
      fromUserId,
      fromUserName: fromUser?.displayName || 'Someone',
      fromUserAvatar: fromUser?.avatarUrl || undefined,
      createdAt: wave.createdAt,
    };

    return { wave, notification };
  }

  async getReceivedWaves(userId: string, limit = 50): Promise<Wave[]> {
    return this.waveRepository.find({
      where: { toUserId: userId },
      relations: ['fromUser'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.waveRepository.count({
      where: { toUserId: userId, isRead: false },
    });
  }

  async markAsRead(waveId: string, userId: string): Promise<void> {
    const wave = await this.waveRepository.findOne({
      where: { id: waveId, toUserId: userId },
    });

    if (!wave) {
      throw new NotFoundException('Wave not found');
    }

    wave.isRead = true;
    wave.readAt = new Date();
    await this.waveRepository.save(wave);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.waveRepository.update(
      { toUserId: userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }
}
