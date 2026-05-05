import { Module } from '@nestjs/common';
import { TrendingService } from './trending.service';
import { RedisService } from '../../common/redis.service';
import { LocationsModule } from '../locations/locations.module';

@Module({
  imports: [LocationsModule],
  providers: [TrendingService, RedisService],
  exports: [TrendingService],
})
export class AnalyticsModule {}
