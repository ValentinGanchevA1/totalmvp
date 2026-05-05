import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { TradingService } from './trading.service';
import { CreateListingDto, UpdateListingDto, CreateOfferDto } from './dto';

@ApiTags('trading')
@ApiBearerAuth()
@Controller('trading')
@UseGuards(JwtAuthGuard)
export class TradingController {
  constructor(private readonly tradingService: TradingService) {}

  // ═══════════════════════════════════════════════════════════════════════
  // LISTINGS
  // ═══════════════════════════════════════════════════════════════════════

  @Post('listings')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a new listing' })
  async createListing(
    @CurrentUser() user: User,
    @Body() dto: CreateListingDto,
  ) {
    return this.tradingService.createListing(user.id, dto);
  }

  @Post('listings/upload-photo')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Upload a listing photo' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo'))
  async uploadPhoto(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const url = await this.tradingService.uploadListingPhoto(user.id, file);
    return { url };
  }

  @Get('listings/nearby')
  @ApiOperation({ summary: 'Get nearby listings' })
  async getNearbyListings(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radius') radius?: string,
    @Query('category') category?: string,
    @Query('condition') condition?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.tradingService.findNearbyListings(
      parseFloat(latitude),
      parseFloat(longitude),
      radius ? parseFloat(radius) : 25,
      { category, condition },
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('listings/my')
  @ApiOperation({ summary: 'Get my listings' })
  async getMyListings(@CurrentUser() user: User) {
    return this.tradingService.getMyListings(user.id);
  }

  @Get('listings/favorites')
  @ApiOperation({ summary: 'Get my favorite listings' })
  async getFavorites(@CurrentUser() user: User) {
    return this.tradingService.getUserFavorites(user.id);
  }

  @Get('listings/:id')
  @ApiOperation({ summary: 'Get listing details' })
  async getListing(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const listing = await this.tradingService.findByIdWithOffers(id);

    // Increment view count if not the seller
    if (listing.sellerId !== user.id) {
      await this.tradingService.incrementViewCount(id);
    }

    // Check if user has favorited
    const isFavorited = await this.tradingService.isListingFavorited(id, user.id);

    return {
      ...listing,
      isFavorited,
    };
  }

  @Patch('listings/:id')
  @ApiOperation({ summary: 'Update listing' })
  async updateListing(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.tradingService.updateListing(id, user.id, dto);
  }

  @Delete('listings/:id')
  @ApiOperation({ summary: 'Delete listing' })
  async deleteListing(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.tradingService.deleteListing(id, user.id);
    return { success: true };
  }

  @Post('listings/:id/favorite')
  @ApiOperation({ summary: 'Toggle favorite' })
  async toggleFavorite(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const isFavorited = await this.tradingService.toggleFavorite(id, user.id);
    return { isFavorited };
  }

  @Post('listings/:id/complete')
  @ApiOperation({ summary: 'Mark trade as completed' })
  async completeTrade(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tradingService.completeTrade(id, user.id);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // OFFERS
  // ═══════════════════════════════════════════════════════════════════════

  @Post('listings/:id/offers')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Make an offer on listing' })
  async createOffer(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOfferDto,
  ) {
    return this.tradingService.createOffer(id, user.id, dto);
  }

  @Get('offers/received')
  @ApiOperation({ summary: 'Get received offers' })
  async getReceivedOffers(@CurrentUser() user: User) {
    return this.tradingService.getReceivedOffers(user.id);
  }

  @Get('offers/sent')
  @ApiOperation({ summary: 'Get sent offers' })
  async getSentOffers(@CurrentUser() user: User) {
    return this.tradingService.getSentOffers(user.id);
  }

  @Patch('offers/:id/accept')
  @ApiOperation({ summary: 'Accept an offer' })
  async acceptOffer(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tradingService.acceptOffer(id, user.id);
  }

  @Patch('offers/:id/reject')
  @ApiOperation({ summary: 'Reject an offer' })
  async rejectOffer(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tradingService.rejectOffer(id, user.id);
  }

  @Patch('offers/:id/withdraw')
  @ApiOperation({ summary: 'Withdraw an offer' })
  async withdrawOffer(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tradingService.withdrawOffer(id, user.id);
  }
}
