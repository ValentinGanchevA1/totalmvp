// src/modules/events/dto/create-question.dto.ts
import { IsString, MaxLength } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  @MaxLength(1000)
  content: string;
}
