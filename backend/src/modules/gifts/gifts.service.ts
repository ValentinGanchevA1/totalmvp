// src/modules/gifts/gifts.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import {
  GiftCatalog,
  GiftCategory,
  UserWallet,
  GiftTransaction,
  GiftContext,
} from './entities';

const CREATOR_SHARE_PERCENT = 70;
const PLATFORM_FEE_PERCENT = 30;

// Coin packages available for purchase
const COIN_PACKAGES = [
  { coins: 100, price: 0.99, bonusCoins: 0 },
  { coins: 500, price: 4.99, bonusCoins: 50 },
  { coins: 1000, price: 9.99, bonusCoins: 150 },
  { coins: 2500, price: 24.99, bonusCoins: 500 },
  { coins: 5000, price: 49.99, bonusCoins: 1250 },
  { coins: 10000, price: 99.99, bonusCoins: 3000 },
];

@Injectable()
export class GiftsService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(GiftCatalog)
    private readonly giftCatalogRepository: Repository<GiftCatalog>,
    @InjectRepository(UserWallet)
    private readonly walletRepository: Repository<UserWallet>,
    @InjectRepository(GiftTransaction)
    private readonly transactionRepository: Repository<GiftTransaction>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY') || '';
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });
  }

  // ==================== CATALOG ====================

  async getCatalog(category?: GiftCategory): Promise<GiftCatalog[]> {
    const where: any = { isActive: true };
    if (category) {
      where.category = category;
    }

    return this.giftCatalogRepository.find({
      where,
      order: { category: 'ASC', sortOrder: 'ASC' },
    });
  }

  async getGiftById(id: string): Promise<GiftCatalog> {
    const gift = await this.giftCatalogRepository.findOne({
      where: { id, isActive: true },
    });

    if (!gift) {
      throw new NotFoundException('Gift not found');
    }

    return gift;
  }

  // ==================== WALLET ====================

  async getOrCreateWallet(userId: string): Promise<UserWallet> {
    let wallet = await this.walletRepository.findOne({ where: { userId } });

    if (!wallet) {
      wallet = this.walletRepository.create({
        userId,
        coinBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
      });
      wallet = await this.walletRepository.save(wallet);
    }

    return wallet;
  }

  async getWalletBalance(userId: string): Promise<{
    coinBalance: number;
    totalEarned: number;
    totalSpent: number;
  }> {
    const wallet = await this.getOrCreateWallet(userId);
    return {
      coinBalance: wallet.coinBalance,
      totalEarned: wallet.totalEarned,
      totalSpent: wallet.totalSpent,
    };
  }

  async getCoinPackages() {
    return COIN_PACKAGES;
  }

  async createTopUpIntent(
    userId: string,
    packageIndex: number,
  ): Promise<{ clientSecret: string; coins: number }> {
    if (packageIndex < 0 || packageIndex >= COIN_PACKAGES.length) {
      throw new BadRequestException('Invalid package');
    }

    const pkg = COIN_PACKAGES[packageIndex];
    const amountInCents = Math.round(pkg.price * 100);

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        userId,
        coins: pkg.coins.toString(),
        bonusCoins: pkg.bonusCoins.toString(),
        type: 'coin_purchase',
      },
    });

    return {
      clientSecret: paymentIntent.client_secret || '',
      coins: pkg.coins + pkg.bonusCoins,
    };
  }

  async addCoins(userId: string, amount: number): Promise<UserWallet> {
    const wallet = await this.getOrCreateWallet(userId);
    wallet.coinBalance += amount;
    return this.walletRepository.save(wallet);
  }

  async handleTopUpWebhook(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const { userId, coins, bonusCoins } = paymentIntent.metadata;
    const totalCoins = parseInt(coins, 10) + parseInt(bonusCoins, 10);

    await this.addCoins(userId, totalCoins);
    console.log(`Added ${totalCoins} coins to user ${userId}`);
  }

  // ==================== SENDING GIFTS ====================

  async sendGift(
    senderId: string,
    recipientId: string,
    giftId: string,
    quantity: number = 1,
    message?: string,
    context?: GiftContext,
  ): Promise<GiftTransaction> {
    if (senderId === recipientId) {
      throw new BadRequestException('Cannot send gift to yourself');
    }

    if (quantity < 1 || quantity > 100) {
      throw new BadRequestException('Invalid quantity');
    }

    const gift = await this.getGiftById(giftId);
    const totalCost = gift.coinPrice * quantity;

    // Check sender balance
    const senderWallet = await this.getOrCreateWallet(senderId);
    if (senderWallet.coinBalance < totalCost) {
      throw new BadRequestException('Insufficient coin balance');
    }

    // Calculate shares
    const creatorShare = Math.floor(totalCost * (CREATOR_SHARE_PERCENT / 100));
    const platformFee = totalCost - creatorShare;

    // Use transaction for atomic operations
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Deduct from sender
      senderWallet.coinBalance -= totalCost;
      senderWallet.totalSpent += totalCost;
      await queryRunner.manager.save(senderWallet);

      // Add to recipient
      const recipientWallet = await this.getOrCreateWallet(recipientId);
      recipientWallet.coinBalance += creatorShare;
      recipientWallet.totalEarned += creatorShare;
      await queryRunner.manager.save(recipientWallet);

      // Create transaction record
      const transaction = this.transactionRepository.create({
        senderId,
        recipientId,
        giftId,
        quantity,
        coinAmount: totalCost,
        creatorShare,
        platformFee,
        message: message || undefined,
        context: context || {},
      });

      const savedTransaction = await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();

      return savedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ==================== TRANSACTION HISTORY ====================

  async getSentGifts(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<GiftTransaction[]> {
    return this.transactionRepository.find({
      where: { senderId: userId },
      relations: ['recipient', 'gift'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getReceivedGifts(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<GiftTransaction[]> {
    return this.transactionRepository.find({
      where: { recipientId: userId },
      relations: ['sender', 'gift'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getGiftStats(userId: string): Promise<{
    totalSent: number;
    totalReceived: number;
    uniqueGifterCount: number;
    mostReceivedGift: { gift: GiftCatalog; count: number } | null;
  }> {
    const sentStats = await this.transactionRepository
      .createQueryBuilder('tx')
      .select('SUM(tx.coinAmount)', 'total')
      .where('tx.senderId = :userId', { userId })
      .getRawOne();

    const receivedStats = await this.transactionRepository
      .createQueryBuilder('tx')
      .select('SUM(tx.creatorShare)', 'total')
      .where('tx.recipientId = :userId', { userId })
      .getRawOne();

    const uniqueGifters = await this.transactionRepository
      .createQueryBuilder('tx')
      .select('COUNT(DISTINCT tx.senderId)', 'count')
      .where('tx.recipientId = :userId', { userId })
      .getRawOne();

    const mostReceived = await this.transactionRepository
      .createQueryBuilder('tx')
      .select('tx.giftId', 'giftId')
      .addSelect('SUM(tx.quantity)', 'count')
      .where('tx.recipientId = :userId', { userId })
      .groupBy('tx.giftId')
      .orderBy('count', 'DESC')
      .limit(1)
      .getRawOne();

    let mostReceivedGift = null;
    if (mostReceived) {
      const gift = await this.giftCatalogRepository.findOne({
        where: { id: mostReceived.giftId },
      });
      if (gift) {
        mostReceivedGift = { gift, count: parseInt(mostReceived.count, 10) };
      }
    }

    return {
      totalSent: parseInt(sentStats?.total, 10) || 0,
      totalReceived: parseInt(receivedStats?.total, 10) || 0,
      uniqueGifterCount: parseInt(uniqueGifters?.count, 10) || 0,
      mostReceivedGift,
    };
  }

  // ==================== EARNINGS ====================

  async getEarnings(userId: string): Promise<{
    totalEarned: number;
    thisWeek: number;
    thisMonth: number;
    withdrawable: number;
  }> {
    const wallet = await this.getOrCreateWallet(userId);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const weeklyEarnings = await this.transactionRepository
      .createQueryBuilder('tx')
      .select('SUM(tx.creatorShare)', 'total')
      .where('tx.recipientId = :userId', { userId })
      .andWhere('tx.createdAt >= :weekAgo', { weekAgo })
      .getRawOne();

    const monthlyEarnings = await this.transactionRepository
      .createQueryBuilder('tx')
      .select('SUM(tx.creatorShare)', 'total')
      .where('tx.recipientId = :userId', { userId })
      .andWhere('tx.createdAt >= :monthAgo', { monthAgo })
      .getRawOne();

    // Withdrawable = current balance (could add minimum threshold)
    const withdrawable = wallet.coinBalance;

    return {
      totalEarned: wallet.totalEarned,
      thisWeek: parseInt(weeklyEarnings?.total, 10) || 0,
      thisMonth: parseInt(monthlyEarnings?.total, 10) || 0,
      withdrawable,
    };
  }
}
