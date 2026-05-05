// src/modules/gifts/gifts.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GiftsController } from './gifts.controller';
import { GiftsService } from './gifts.service';
import { GiftCatalog, UserWallet, GiftTransaction } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([GiftCatalog, UserWallet, GiftTransaction]),
  ],
  controllers: [GiftsController],
  providers: [GiftsService],
  exports: [GiftsService],
})
export class GiftsModule {}
