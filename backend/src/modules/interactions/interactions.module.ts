import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wave } from './entities/wave.entity';
import { User } from '../users/entities/user.entity';
import { InteractionsController } from './interactions.controller';
import { InteractionsService } from './interactions.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wave, User]),
    ChatModule,
  ],
  controllers: [InteractionsController],
  providers: [InteractionsService],
  exports: [InteractionsService],
})
export class InteractionsModule {}
