import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateOfferDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  offerItems?: string;
}
