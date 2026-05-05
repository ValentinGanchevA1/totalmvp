// src/modules/events/dto/create-poll.dto.ts
import {
  IsString,
  IsArray,
  IsBoolean,
  IsOptional,
  IsDateString,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PollOptionDto {
  @IsString()
  @MaxLength(200)
  text: string;
}

export class CreatePollDto {
  @IsString()
  @MaxLength(500)
  question: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PollOptionDto)
  options: PollOptionDto[];

  @IsOptional()
  @IsBoolean()
  allowMultiple?: boolean;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

export class VotePollDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  optionIds: string[];
}
