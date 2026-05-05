import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { User } from '../users/entities/user.entity';
import { MessageType } from './entities/message.entity';

class CreateConversationDto {
  participantId: string;
}

class SendMessageDto {
  content: string;
  type?: MessageType;
  metadata?: any;
}

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations' })
  async getConversations(@CurrentUser() user: User) {
    return this.chatService.getUserConversations(user.id);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Create or get existing conversation' })
  async createConversation(
    @CurrentUser() user: User,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.getOrCreateConversation(user.id, dto.participantId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  async getMessages(
    @Param('id') conversationId: string,
    @Query('limit') limit?: number,
    @Query('beforeId') beforeId?: string,
  ) {
    return this.chatService.getMessages(conversationId, limit || 50, beforeId);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message' })
  async sendMessage(
    @CurrentUser() user: User,
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(
      conversationId,
      user.id,
      dto.content,
      dto.type,
      dto.metadata,
    );
  }

  @Put('conversations/:id/read')
  @ApiOperation({ summary: 'Mark messages as read' })
  async markAsRead(
    @CurrentUser() user: User,
    @Param('id') conversationId: string,
  ) {
    await this.chatService.markAsRead(conversationId, user.id);
    return { success: true };
  }
}
