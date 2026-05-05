import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DiscoveryService } from './discovery.service';

interface AuthenticatedRequest {
  user: { id: string };
}

@Controller('discovery')
@UseGuards(JwtAuthGuard)
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('profiles')
  async getProfiles(
    @Request() req: AuthenticatedRequest,
    @Query('minAge') minAge?: string,
    @Query('maxAge') maxAge?: string,
    @Query('maxDistance') maxDistance?: string,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
  ) {
    return this.discoveryService.getDiscoveryProfiles(req.user.id, {
      minAge: minAge ? parseInt(minAge) : undefined,
      maxAge: maxAge ? parseInt(maxAge) : undefined,
      maxDistance: maxDistance ? parseInt(maxDistance) : undefined,
      skip: skip ? parseInt(skip) : 0,
      limit: limit ? parseInt(limit) : 10,
    });
  }

  @Post('like/:userId')
  async likeUser(@Request() req: AuthenticatedRequest, @Param('userId') userId: string) {
    return this.discoveryService.likeUser(req.user.id, userId);
  }

  @Post('pass/:userId')
  async passUser(@Request() req: AuthenticatedRequest, @Param('userId') userId: string) {
    await this.discoveryService.passUser(req.user.id, userId);
    return { success: true };
  }

  @Post('super-like/:userId')
  async superLikeUser(@Request() req: AuthenticatedRequest, @Param('userId') userId: string) {
    return this.discoveryService.superLikeUser(req.user.id, userId);
  }

  @Get('matches')
  async getMatches(@Request() req: AuthenticatedRequest) {
    return this.discoveryService.getMatches(req.user.id);
  }

  @Delete('matches/:matchId')
  async unmatch(@Request() req: AuthenticatedRequest, @Param('matchId') matchId: string) {
    await this.discoveryService.unmatch(req.user.id, matchId);
    return { success: true };
  }

  @Get('likes')
  async getLikesReceived(@Request() req: AuthenticatedRequest) {
    // Premium feature
    return this.discoveryService.getLikesReceived(req.user.id);
  }

  @Post('rewind')
  async rewindLastSwipe(@Request() req: AuthenticatedRequest) {
    return this.discoveryService.rewindLastSwipe(req.user.id);
  }

  @Post('boost')
  async activateBoost(@Request() req: AuthenticatedRequest) {
    return this.discoveryService.activateBoost(req.user.id);
  }

  @Get('boost/status')
  async getBoostStatus(@Request() req: AuthenticatedRequest) {
    return this.discoveryService.getBoostStatus(req.user.id);
  }
}
