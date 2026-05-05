// src/modules/gamification/gamification.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { RedisService } from '../../common/redis.service';
import {
  Achievement,
  UserAchievement,
  Challenge,
  UserChallenge,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Achievement,
      UserAchievement,
      Challenge,
      UserChallenge,
    ]),
  ],
  controllers: [GamificationController],
  providers: [GamificationService, RedisService],
  exports: [GamificationService],
})
export class GamificationModule {}
