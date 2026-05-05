import { IsUUID, IsNotEmpty } from 'class-validator';

export class SendWaveDto {
  @IsUUID()
  @IsNotEmpty()
  toUserId: string;
}
