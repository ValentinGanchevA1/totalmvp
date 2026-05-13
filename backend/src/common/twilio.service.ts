import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TwilioClient {
  messages: {
    create(opts: { body: string; from: string; to: string }): Promise<unknown>;
  };
}

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private client: TwilioClient | null = null;
  private fromNumber: string;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER') || '';

    if (accountSid && authToken) {
      import('twilio').then((twilio) => {
        this.client = twilio.default(accountSid, authToken) as unknown as TwilioClient;
      }).catch(() => {
        this.logger.warn('Twilio SDK unavailable — SMS functionality disabled');
      });
    }
  }

  async sendSMS(to: string, message: string): Promise<void> {
    if (!this.client) {
      this.logger.warn('Twilio not configured — skipping SMS send');
      return;
    }

    await this.client.messages.create({
      body: message,
      from: this.fromNumber,
      to,
    });
  }

  async sendVerificationCode(to: string, code: string): Promise<void> {
    await this.sendSMS(to, `Your verification code is: ${code}`);
  }
}
