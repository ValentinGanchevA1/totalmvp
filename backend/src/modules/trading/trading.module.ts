import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradingController } from './trading.controller';
import { TradingService } from './trading.service';
import { TradeListing, TradeOffer, TradeFavorite } from './entities';
import { S3Service } from '../../common/s3.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TradeListing, TradeOffer, TradeFavorite]),
  ],
  controllers: [TradingController],
  providers: [TradingService, S3Service],
  exports: [TradingService],
})
export class TradingModule {}
