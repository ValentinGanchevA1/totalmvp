import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { TradeListing, ListingStatus } from './entities/trade-listing.entity';
import { TradeOffer, OfferStatus } from './entities/trade-offer.entity';
import { TradeFavorite } from './entities/trade-favorite.entity';
import { CreateListingDto, UpdateListingDto, CreateOfferDto } from './dto';
import { S3Service } from '../../common/s3.service';

export interface NearbyListing {
  id: string;
  title: string;
  description: string | null;
  category: string;
  condition: string;
  photos: string[];
  address: string | null;
  lookingFor: string | null;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  latitude: number;
  longitude: number;
  distance: number;
  sellerName: string;
  sellerAvatar: string | null;
  verificationScore: number;
  offerCount: number;
}

@Injectable()
export class TradingService {
  constructor(
    @InjectRepository(TradeListing)
    private readonly listingRepository: Repository<TradeListing>,
    @InjectRepository(TradeOffer)
    private readonly offerRepository: Repository<TradeOffer>,
    @InjectRepository(TradeFavorite)
    private readonly favoriteRepository: Repository<TradeFavorite>,
    private readonly s3Service: S3Service,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  // LISTINGS CRUD
  // ═══════════════════════════════════════════════════════════════════════

  async createListing(sellerId: string, dto: CreateListingDto): Promise<TradeListing> {
    const result = await this.listingRepository.query(
      `
      INSERT INTO trade_listings (
        "sellerId", "title", "description", "category", "condition",
        "photos", "location", "address", "lookingFor", "metadata"
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography,
        $9, $10, $11
      ) RETURNING *
      `,
      [
        sellerId,
        dto.title,
        dto.description || null,
        dto.category,
        dto.condition,
        dto.photos || [],
        dto.longitude,
        dto.latitude,
        dto.address || null,
        dto.lookingFor || null,
        JSON.stringify(dto.metadata || {}),
      ],
    );
    return result[0];
  }

  async findNearbyListings(
    latitude: number,
    longitude: number,
    radiusKm: number = 25,
    filters?: { category?: string; condition?: string },
    limit: number = 20,
    offset: number = 0,
  ): Promise<NearbyListing[]> {
    const radiusMeters = radiusKm * 1000;
    let whereClause = `l.status = 'active'`;
    const params: (string | number)[] = [longitude, latitude, radiusMeters, limit, offset];
    let paramIndex = 6;

    if (filters?.category) {
      whereClause += ` AND l.category = $${paramIndex++}`;
      params.push(filters.category);
    }
    if (filters?.condition) {
      whereClause += ` AND l.condition = $${paramIndex++}`;
      params.push(filters.condition);
    }

    const results = await this.listingRepository.query(
      `
      SELECT
        l.id,
        l.title,
        l.description,
        l.category,
        l.condition,
        l.photos,
        l.address,
        l."lookingFor",
        l.status,
        l.metadata,
        l."createdAt",
        ST_Y(l.location::geometry) as latitude,
        ST_X(l.location::geometry) as longitude,
        ST_Distance(l.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance,
        u."displayName" as "sellerName",
        u."avatarUrl" as "sellerAvatar",
        u."verificationScore",
        (SELECT COUNT(*) FROM trade_offers WHERE "listingId" = l.id AND status = 'pending')::int as "offerCount"
      FROM trade_listings l
      JOIN users u ON l."sellerId" = u.id
      WHERE ${whereClause}
        AND ST_DWithin(l.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
      ORDER BY distance ASC, l."createdAt" DESC
      LIMIT $4 OFFSET $5
      `,
      params,
    );

    return results.map((r: Record<string, unknown>) => ({
      ...r,
      distance: Math.round(Number(r.distance) / 1000 * 10) / 10, // Convert to km
    })) as NearbyListing[];
  }

  async findById(id: string): Promise<TradeListing> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: ['seller'],
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    return listing;
  }

  async findByIdWithOffers(id: string): Promise<TradeListing> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: ['seller', 'offers', 'offers.buyer'],
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    return listing;
  }

  async getMyListings(userId: string): Promise<TradeListing[]> {
    return this.listingRepository.find({
      where: { sellerId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateListing(
    id: string,
    userId: string,
    dto: UpdateListingDto,
  ): Promise<TradeListing> {
    const listing = await this.findById(id);
    if (listing.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can update this listing');
    }

    // Build update object
    const updateData: Partial<TradeListing> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.condition !== undefined) updateData.condition = dto.condition;
    if (dto.photos !== undefined) updateData.photos = dto.photos;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.lookingFor !== undefined) updateData.lookingFor = dto.lookingFor;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.metadata !== undefined) updateData.metadata = dto.metadata;

    // Update location if provided
    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      await this.listingRepository.query(
        `UPDATE trade_listings SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3`,
        [dto.longitude, dto.latitude, id],
      );
    }

    if (Object.keys(updateData).length > 0) {
      await this.listingRepository.update(id, updateData);
    }

    return this.findById(id);
  }

  async deleteListing(id: string, userId: string): Promise<void> {
    const listing = await this.findById(id);
    if (listing.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can delete this listing');
    }

    // Delete photos from S3
    for (const photo of listing.photos) {
      try {
        const key = this.extractS3Key(photo);
        if (key) {
          await this.s3Service.delete(key);
        }
      } catch {
        // Continue even if S3 delete fails
      }
    }

    await this.listingRepository.update(id, { status: ListingStatus.CANCELLED });
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.listingRepository.increment({ id }, 'viewCount', 1);
  }

  async uploadListingPhoto(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    // Validate file
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Use JPEG, PNG, or WebP');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File too large. Maximum 10MB');
    }

    const key = `trading/${userId}/${Date.now()}.jpg`;
    return this.s3Service.upload(file.buffer, key, file.mimetype);
  }

  private extractS3Key(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1); // Remove leading /
    } catch {
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // OFFERS
  // ═══════════════════════════════════════════════════════════════════════

  async createOffer(
    listingId: string,
    buyerId: string,
    dto: CreateOfferDto,
  ): Promise<TradeOffer> {
    const listing = await this.findById(listingId);

    if (listing.sellerId === buyerId) {
      throw new BadRequestException('Cannot make offer on your own listing');
    }
    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException('Listing is not available');
    }

    // Check if offer already exists
    const existing = await this.offerRepository.findOne({
      where: { listingId, buyerId },
    });
    if (existing) {
      throw new BadRequestException('You already made an offer on this listing');
    }

    const offer = this.offerRepository.create({
      listingId,
      buyerId,
      message: dto.message,
      offerItems: dto.offerItems,
    });

    return this.offerRepository.save(offer);
  }

  async getReceivedOffers(userId: string): Promise<TradeOffer[]> {
    return this.offerRepository
      .createQueryBuilder('o')
      .innerJoinAndSelect('o.listing', 'l')
      .innerJoinAndSelect('o.buyer', 'b')
      .where('l."sellerId" = :userId', { userId })
      .andWhere('o.status = :status', { status: OfferStatus.PENDING })
      .orderBy('o."createdAt"', 'DESC')
      .getMany();
  }

  async getSentOffers(userId: string): Promise<TradeOffer[]> {
    return this.offerRepository.find({
      where: { buyerId: userId },
      relations: ['listing', 'listing.seller'],
      order: { createdAt: 'DESC' },
    });
  }

  async acceptOffer(offerId: string, userId: string): Promise<TradeOffer> {
    const offer = await this.offerRepository.findOne({
      where: { id: offerId },
      relations: ['listing', 'buyer'],
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }
    if (offer.listing.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can accept offers');
    }
    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Offer is no longer pending');
    }

    // Accept this offer
    offer.status = OfferStatus.ACCEPTED;
    offer.respondedAt = new Date();
    await this.offerRepository.save(offer);

    // Reject all other pending offers for this listing
    await this.offerRepository.update(
      {
        listingId: offer.listingId,
        status: OfferStatus.PENDING,
        id: Not(offerId),
      },
      {
        status: OfferStatus.REJECTED,
        respondedAt: new Date(),
      },
    );

    // Update listing status to pending (awaiting meetup)
    await this.listingRepository.update(offer.listingId, {
      status: ListingStatus.PENDING,
    });

    return offer;
  }

  async rejectOffer(offerId: string, userId: string): Promise<TradeOffer> {
    const offer = await this.offerRepository.findOne({
      where: { id: offerId },
      relations: ['listing'],
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }
    if (offer.listing.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can reject offers');
    }
    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Offer is no longer pending');
    }

    offer.status = OfferStatus.REJECTED;
    offer.respondedAt = new Date();
    return this.offerRepository.save(offer);
  }

  async withdrawOffer(offerId: string, userId: string): Promise<TradeOffer> {
    const offer = await this.offerRepository.findOne({
      where: { id: offerId },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }
    if (offer.buyerId !== userId) {
      throw new ForbiddenException('Only the buyer can withdraw their offer');
    }
    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Offer is no longer pending');
    }

    offer.status = OfferStatus.WITHDRAWN;
    return this.offerRepository.save(offer);
  }

  async completeTrade(listingId: string, userId: string): Promise<TradeListing> {
    const listing = await this.findById(listingId);
    if (listing.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can complete the trade');
    }
    if (listing.status !== ListingStatus.PENDING) {
      throw new BadRequestException('Listing must be in pending status to complete');
    }

    listing.status = ListingStatus.COMPLETED;
    listing.completedAt = new Date();
    return this.listingRepository.save(listing);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FAVORITES
  // ═══════════════════════════════════════════════════════════════════════

  async toggleFavorite(listingId: string, userId: string): Promise<boolean> {
    // Check if listing exists
    await this.findById(listingId);

    const existing = await this.favoriteRepository.findOne({
      where: { listingId, userId },
    });

    if (existing) {
      await this.favoriteRepository.remove(existing);
      return false;
    }

    await this.favoriteRepository.save({ listingId, userId });
    return true;
  }

  async getUserFavorites(userId: string): Promise<TradeListing[]> {
    const favorites = await this.favoriteRepository.find({
      where: { userId },
      relations: ['listing', 'listing.seller'],
      order: { createdAt: 'DESC' },
    });
    return favorites.map((f) => f.listing);
  }

  async isListingFavorited(listingId: string, userId: string): Promise<boolean> {
    const count = await this.favoriteRepository.count({
      where: { listingId, userId },
    });
    return count > 0;
  }
}
