import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { UserSkillsHistory } from '../users/entities/user-skills-history.entity';
import { CommonModule } from '../../common/common.module';
import { ProfilesController } from './profiles.controller';
import { SkillsService } from './skills.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserSkillsHistory]),
    CommonModule,
  ],
  controllers: [ProfilesController],
  providers: [SkillsService],
  exports: [SkillsService], // Export for use by other modules
})
export class ProfilesModule {}
