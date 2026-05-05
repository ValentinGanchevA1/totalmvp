import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { RedisService } from './redis.service';
import { TwilioService } from './twilio.service';
import { FaceCompareService } from './face-compare.service';
import { EmailService } from './email.service';
import { CacheService } from './cache.service';

@Module({
  providers: [S3Service, RedisService, TwilioService, FaceCompareService, EmailService, CacheService],
  exports: [S3Service, RedisService, TwilioService, FaceCompareService, EmailService, CacheService],
})
export class CommonModule {}
