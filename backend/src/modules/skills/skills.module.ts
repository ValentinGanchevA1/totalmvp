import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { UserSkillsHistory } from '../users/entities/user-skills-history.entity';
import { CommonModule } from '../../common/common.module';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserSkillsHistory]),
    CommonModule,
  ],
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}
