// src/modules/gifts/gifts.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GiftsService } from './gifts.service';
import { GiftCategory, GiftContext } from './entities';

interface AuthRequest extends Request {
  user: { id: string };
}

class SendGiftDto {
  recipientId: string;
  giftId: string;
  quantity?: number;
  message?: string;
  context?: GiftContext;
}

class TopUpDto {
  packageIndex: number;
}

@ApiTags('gifts')
@ApiBearerAuth()
@Controller('gifts')
@UseGuards(JwtAuthGuard)
export class GiftsController {
  constructor(private readonly giftsService: GiftsService) {}

  // ==================== CATALOG ====================

  @Get('catalog')
  @ApiOperation({ summary: 'Get gift catalog' })
  async getCatalog(@Query('category') category?: GiftCategory) {
    return this.giftsService.getCatalog(category);
  }

  @Get('catalog/:id')
  @ApiOperation({ summary: 'Get gift details' })
  async getGift(@Param('id', ParseUUIDPipe) id: string) {
    return this.giftsService.getGiftById(id);
  }

  // ==================== WALLET ====================

  @Get('wallet')
  @ApiOperation({ summary: 'Get wallet balance' })
  async getWallet(@Req() req: AuthRequest) {
    return this.giftsService.getWalletBalance(req.user.id);
  }

  @Get('wallet/packages')
  @ApiOperation({ summary: 'Get coin packages for purchase' })
  async getCoinPackages() {
    return this.giftsService.getCoinPackages();
  }

  @Post('wallet/topup')
  @ApiOperation({ summary: 'Create payment intent for coin purchase' })
  async topUp(@Req() req: AuthRequest, @Body() dto: TopUpDto) {
    return this.giftsService.createTopUpIntent(req.user.id, dto.packageIndex);
  }

  // ==================== SEND GIFTS ====================

  @Post('send')
  @ApiOperation({ summary: 'Send a gift to another user' })
  async sendGift(@Req() req: AuthRequest, @Body() dto: SendGiftDto) {
    return this.giftsService.sendGift(
      req.user.id,
      dto.recipientId,
      dto.giftId,
      dto.quantity || 1,
      dto.message,
      dto.context,
    );
  }

  // ==================== HISTORY ====================

  @Get('sent')
  @ApiOperation({ summary: 'Get sent gifts history' })
  async getSentGifts(
    @Req() req: AuthRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.giftsService.getSentGifts(
      req.user.id,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('received')
  @ApiOperation({ summary: 'Get received gifts history' })
  async getReceivedGifts(
    @Req() req: AuthRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.giftsService.getReceivedGifts(
      req.user.id,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get gift statistics' })
  async getGiftStats(@Req() req: AuthRequest) {
    return this.giftsService.getGiftStats(req.user.id);
  }

  // ==================== EARNINGS ====================

  @Get('earnings')
  @ApiOperation({ summary: 'Get creator earnings' })
  async getEarnings(@Req() req: AuthRequest) {
    return this.giftsService.getEarnings(req.user.id);
  }
}
