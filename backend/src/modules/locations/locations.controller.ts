import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LocationsService, NearbyUser } from './locations.service';
import { EventsService } from '../events/events.service';
import { User } from '../users/entities/user.entity';

export interface NearbyEvent {
  id: string;
  title: string;
  category: string;
  latitude: number;
  longitude: number;
  distance: number;
  startTime: Date;
  attendeeCount: number;
  hostName: string;
  hostAvatar: string | null;
  coverImageUrl: string | null;
}

export interface MapDataResponse {
  users: NearbyUser[];
  events: NearbyEvent[];
}

// Raw event data from PostgreSQL query
interface RawEventQueryResult {
  id: string;
  title: string;
  category: string;
  latitude: number;
  longitude: number;
  distance: string;
  startTime: Date;
  attendeeCount: string;
  hostName: string;
  hostAvatar: string | null;
  coverImageUrl: string | null;
}

class UpdateLocationDto {
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Type(() => Number)
  longitude: number;
}

class NearbyQueryDto {
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  radiusKm?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}

@ApiTags('locations')
@Controller('locations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LocationsController {
  constructor(
    private readonly locationsService: LocationsService,
    private readonly eventsService: EventsService,
  ) {}

  @Post('update')
  @Throttle({ short: { limit: 12, ttl: 60000 } }) // 12 updates per minute (1 every 5 seconds)
  @ApiOperation({ summary: 'Update user location' })
  async updateLocation(
    @CurrentUser() user: User,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locationsService.updateLocation(
      user.id,
      dto.latitude,
      dto.longitude,
    );
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Get nearby users' })
  async getNearbyUsers(
    @CurrentUser() user: User,
    @Query() query: NearbyQueryDto,
  ): Promise<NearbyUser[]> {
    return this.locationsService.findNearbyUsers(
      user.id,
      query.latitude,
      query.longitude,
      query.radiusKm || 5,
      query.limit || 50,
    );
  }

  @Get('bounding-box')
  @ApiOperation({ summary: 'Get users in bounding box (map viewport)' })
  async getUsersInBoundingBox(
    @Query('minLat') minLat: number,
    @Query('minLng') minLng: number,
    @Query('maxLat') maxLat: number,
    @Query('maxLng') maxLng: number,
    @Query('limit') limit?: number,
  ): Promise<NearbyUser[]> {
    return this.locationsService.getUsersInBoundingBox(
      minLat,
      minLng,
      maxLat,
      maxLng,
      limit || 100,
    );
  }

  @Get('map-data')
  @Throttle({ short: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({ summary: 'Get combined map data (users + events)' })
  async getMapData(
    @CurrentUser() user: User,
    @Query() query: NearbyQueryDto,
  ): Promise<MapDataResponse> {
    // Fetch users and events in parallel for performance
    const [users, rawEvents] = await Promise.all([
      this.locationsService.findNearbyUsers(
        user.id,
        query.latitude,
        query.longitude,
        query.radiusKm || 5,
        query.limit || 50,
      ),
      this.eventsService.findNearbyEvents(
        query.latitude,
        query.longitude,
        query.radiusKm || 10,
        query.limit || 20,
      ),
    ]);

    // Map raw events to NearbyEvent interface
    const events: NearbyEvent[] = rawEvents.map((e: RawEventQueryResult) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      latitude: e.latitude || 0,
      longitude: e.longitude || 0,
      distance: parseFloat(e.distance) || 0,
      startTime: e.startTime,
      attendeeCount: parseInt(e.attendeeCount, 10) || 0,
      hostName: e.hostName,
      hostAvatar: e.hostAvatar,
      coverImageUrl: e.coverImageUrl,
    }));

    return { users, events };
  }
}
