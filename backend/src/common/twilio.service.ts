import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TwilioService {
  private client: any;
  private fromNumber: string;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER') || '';

    if (accountSid && authToken) {
      // Dynamic import to avoid issues if twilio is not installed
      import('twilio').then((twilio) => {
        this.client = twilio.default(accountSid, authToken);
      }).catch(() => {
        console.warn('Twilio SDK not installed, SMS functionality disabled');
      });
    }
  }

  async sendSMS(to: string, message: string): Promise<void> {
    if (!this.client) {
      console.warn('Twilio not configured, skipping SMS send');
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
