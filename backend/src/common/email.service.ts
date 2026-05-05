import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private sendgrid: any = null;

  constructor(private configService: ConfigService) {
    const sendgridApiKey = this.configService.get<string>('SENDGRID_API_KEY');

    if (sendgridApiKey) {
      import('@sendgrid/mail').then((sg) => {
        this.sendgrid = sg.default;
        this.sendgrid.setApiKey(sendgridApiKey);
      }).catch(() => {
        console.warn('SendGrid not installed, falling back to SMTP');
        this.setupSmtp();
      });
    } else {
      this.setupSmtp();
    }
  }

  private setupSmtp(): void {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'smtp.mailtrap.io'),
      port: parseInt(this.configService.get('SMTP_PORT', '587')),
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendVerificationEmail(to: string, code: string, displayName: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #fff; padding: 40px; }
            .container { max-width: 480px; margin: 0 auto; background: #1a1a24; border-radius: 16px; padding: 40px; }
            .logo { font-size: 32px; font-weight: 900; color: #00d4ff; text-align: center; margin-bottom: 24px; }
            .code { font-size: 36px; font-weight: 700; letter-spacing: 8px; text-align: center; background: #0a0a0f; padding: 20px; border-radius: 12px; margin: 24px 0; color: #00d4ff; }
            .text { color: #888; line-height: 1.6; text-align: center; }
            .footer { margin-top: 32px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">G88</div>
            <p class="text">Hey ${displayName},</p>
            <p class="text">Your verification code is:</p>
            <div class="code">${code}</div>
            <p class="text">This code expires in 10 minutes.</p>
            <p class="text">If you didn't request this, please ignore this email.</p>
            <div class="footer">&copy; ${new Date().getFullYear()} G88. All rights reserved.</div>
          </div>
        </body>
      </html>
    `;

    await this.send({
      to,
      subject: `${code} is your G88 verification code`,
      html,
      text: `Your G88 verification code is: ${code}. This code expires in 10 minutes.`,
    });
  }

  async sendWelcomeEmail(to: string, displayName: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0a0a0f; color: #fff; padding: 40px; }
            .container { max-width: 480px; margin: 0 auto; background: #1a1a24; border-radius: 16px; padding: 40px; }
            .logo { font-size: 32px; font-weight: 900; color: #00d4ff; text-align: center; }
            .title { font-size: 24px; text-align: center; margin: 24px 0; }
            .text { color: #888; line-height: 1.6; }
            .cta { display: block; background: #00d4ff; color: #000; text-decoration: none; padding: 16px 32px; border-radius: 12px; text-align: center; font-weight: 700; margin: 24px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">G88</div>
            <h1 class="title">Welcome, ${displayName}!</h1>
            <p class="text">Your email is now verified. You've earned the email verification badge!</p>
            <p class="text">Complete more verifications to increase your trust score and get discovered by more people.</p>
            <a href="https://g88.app/verify" class="cta">Complete Your Profile</a>
          </div>
        </body>
      </html>
    `;

    await this.send({
      to,
      subject: 'Welcome to G88!',
      html,
    });
  }

  private async send(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    const mailOptions = {
      from: { email: 'verify@g88.app', name: 'G88' },
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    if (this.sendgrid) {
      await this.sendgrid.send(mailOptions);
    } else if (this.transporter) {
      await this.transporter.sendMail({
        from: '"G88" <verify@g88.app>',
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text,
      });
    } else {
      console.warn('No email transport configured, skipping email send');
    }
  }
}
