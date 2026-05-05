import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
