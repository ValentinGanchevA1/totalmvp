// Backward-compatible aliases for the old /api/v1/profiles/... routes.
// All handlers delegate to UsersService — no business logic lives here.
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
  Header,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './user.service';
import { CreateProfileDto, UpdateProfileDto } from './dto/create-profile.dto';

@ApiTags('profiles (legacy)')
@ApiBearerAuth()
@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesLegacyController {
  constructor(private readonly usersService: UsersService) {}

  /** @deprecated Use GET /api/v1/users/me */
  @Get('me')
  @Header('Deprecation', 'true')
  @Header('Link', '</api/v1/users/me>; rel="successor-version"')
  @ApiOperation({ summary: 'DEPRECATED – use GET /users/me', deprecated: true })
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  /** @deprecated Use GET /api/v1/users/me/completion */
  @Get('me/completion')
  @Header('Deprecation', 'true')
  @Header('Link', '</api/v1/users/me/completion>; rel="successor-version"')
  @ApiOperation({ summary: 'DEPRECATED – use GET /users/me/completion', deprecated: true })
  getCompletionStatus(@CurrentUser('id') userId: string) {
    return this.usersService.getProfileCompletionStatus(userId);
  }

  /** @deprecated Use POST /api/v1/users/profile */
  @Post()
  @Header('Deprecation', 'true')
  @Header('Link', '</api/v1/users/profile>; rel="successor-version"')
  @ApiOperation({ summary: 'DEPRECATED – use POST /users/profile', deprecated: true })
  createProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProfileDto,
  ) {
    return this.usersService.createProfile(userId, dto);
  }

  /** @deprecated Use PATCH /api/v1/users/profile */
  @Patch()
  @Header('Deprecation', 'true')
  @Header('Link', '</api/v1/users/profile>; rel="successor-version"')
  @ApiOperation({ summary: 'DEPRECATED – use PATCH /users/profile', deprecated: true })
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  /** @deprecated Use POST /api/v1/users/profile/photos */
  @Post('photos')
  @UseInterceptors(FileInterceptor('photo'))
  @Header('Deprecation', 'true')
  @Header('Link', '</api/v1/users/profile/photos>; rel="successor-version"')
  @ApiOperation({ summary: 'DEPRECATED – use POST /users/profile/photos', deprecated: true })
  uploadPhoto(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('position', ParseIntPipe) position: number,
  ) {
    return this.usersService.uploadProfilePhoto(userId, file, position);
  }

  /** @deprecated Use DELETE /api/v1/users/profile/photos/:position */
  @Delete('photos/:position')
  @Header('Deprecation', 'true')
  @Header('Link', '</api/v1/users/profile/photos/:position>; rel="successor-version"')
  @ApiOperation({ summary: 'DEPRECATED – use DELETE /users/profile/photos/:position', deprecated: true })
  deletePhoto(
    @CurrentUser('id') userId: string,
    @Param('position', ParseIntPipe) position: number,
  ) {
    return this.usersService.deleteProfilePhoto(userId, position);
  }

  /** @deprecated Use GET /api/v1/users/:id */
  @Get(':id')
  @Header('Deprecation', 'true')
  @Header('Link', '</api/v1/users/:id>; rel="successor-version"')
  @ApiOperation({ summary: 'DEPRECATED – use GET /users/:id', deprecated: true })
  getPublicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id);
  }
}
