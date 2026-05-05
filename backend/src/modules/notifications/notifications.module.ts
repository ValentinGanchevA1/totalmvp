import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { Geofence } from './entities/geofence.entity';
import { GeofenceService } from './geofence.service';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, Geofence]),
    CommonModule,
  ],
  providers: [GeofenceService],
  exports: [GeofenceService],
})
export class NotificationsModule {}
