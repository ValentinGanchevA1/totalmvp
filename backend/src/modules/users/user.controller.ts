// backend/src/modules/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './user.service';
import { CreateProfileDto, UpdateProfileDto } from './dto/create-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Get('me/completion')
  async getCompletionStatus(@CurrentUser('id') userId: string) {
    return this.usersService.getProfileCompletionStatus(userId);
  }

  @Post('profile')
  async createProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProfileDto,
  ) {
    return this.usersService.createProfile(userId, dto);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Post('profile/photos')
  @UseInterceptors(FileInterceptor('photo'))
  async uploadPhoto(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('position', ParseIntPipe) position: number,
  ) {
    return this.usersService.uploadProfilePhoto(userId, file, position);
  }

  @Delete('profile/photos/:position')
  async deletePhoto(
    @CurrentUser('id') userId: string,
    @Param('position', ParseIntPipe) position: number,
  ) {
    return this.usersService.deleteProfilePhoto(userId, position);
  }

  @Get(':id')
  async getPublicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id);
  }
}
