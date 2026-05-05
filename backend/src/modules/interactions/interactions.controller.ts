import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InteractionsService } from './interactions.service';
import { SendWaveDto } from './dto/send-wave.dto';
import { User } from '../users/entities/user.entity';
import { ChatGateway } from '../chat/chat.gateway';

@ApiTags('interactions')
@Controller('interactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InteractionsController {
  constructor(
    private readonly interactionsService: InteractionsService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post('wave')
  @Throttle({ short: { limit: 10, ttl: 60000 } }) // 10 waves per minute to prevent spam
  @ApiOperation({ summary: 'Send a wave to another user' })
  async sendWave(
    @CurrentUser() user: User,
    @Body() dto: SendWaveDto,
  ) {
    const { wave, notification } = await this.interactionsService.sendWave(
      user.id,
      dto.toUserId,
    );

    // Emit real-time notification to recipient
    this.chatGateway.emitWaveToUser(dto.toUserId, notification);

    return { success: true, wave };
  }

  @Get('waves/received')
  @ApiOperation({ summary: 'Get received waves' })
  async getReceivedWaves(
    @CurrentUser() user: User,
    @Query('limit') limit?: number,
  ) {
    const waves = await this.interactionsService.getReceivedWaves(
      user.id,
      limit || 50,
    );

    return waves.map(wave => ({
      id: wave.id,
      fromUserId: wave.fromUserId,
      fromUserName: wave.fromUser?.displayName || 'Unknown',
      fromUserAvatar: wave.fromUser?.avatarUrl,
      isRead: wave.isRead,
      createdAt: wave.createdAt,
    }));
  }

  @Get('waves/unread-count')
  @ApiOperation({ summary: 'Get unread wave count' })
  async getUnreadCount(@CurrentUser() user: User) {
    const count = await this.interactionsService.getUnreadCount(user.id);
    return { count };
  }

  @Patch('waves/:id/read')
  @ApiOperation({ summary: 'Mark a wave as read' })
  async markAsRead(
    @CurrentUser() user: User,
    @Param('id') waveId: string,
  ) {
    await this.interactionsService.markAsRead(waveId, user.id);
    return { success: true };
  }

  @Post('waves/read-all')
  @ApiOperation({ summary: 'Mark all waves as read' })
  async markAllAsRead(@CurrentUser() user: User) {
    await this.interactionsService.markAllAsRead(user.id);
    return { success: true };
  }
}
