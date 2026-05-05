// backend/src/modules/users/dto/create-profile.dto.ts
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsArray,
  ArrayMaxSize,
  IsUrl,
  ValidateNested,
  IsBoolean,
  IsNumber,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  NON_BINARY = 'non_binary',
  OTHER = 'other',
  PREFER_NOT_SAY = 'prefer_not_say',
}

export enum RelationshipGoal {
  DATING = 'dating',
  FRIENDS = 'friends',
  NETWORKING = 'networking',
  BUSINESS = 'business',
}

class LocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class CreateProfileDto {
  @IsString()
  @Length(2, 50)
  displayName: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  bio?: string;

  @IsInt()
  @Min(18)
  @Max(120)
  age: number;

  @IsEnum(Gender)
  gender: Gender;

  @IsOptional()
  @IsEnum(Gender)
  interestedIn?: Gender;

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  interests: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsUrl({}, { each: true })
  photoUrls?: string[];

  @IsEnum(RelationshipGoal, { each: true })
  @IsArray()
  goals: RelationshipGoal[];

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class UpdateProfileDto extends PartialType(CreateProfileDto) {}
