import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service {
  private s3Client: any;
  private bucket: string;
  private region: string;

  constructor(private configService: ConfigService) {
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET') || 'g88-uploads';
    this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1';

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    if (this.region && accessKeyId && secretAccessKey) {
      import('@aws-sdk/client-s3').then(({ S3Client }) => {
        this.s3Client = new S3Client({
          region: this.region,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });
      }).catch(() => {
        console.warn('AWS SDK not installed, S3 functionality disabled');
      });
    }
  }

  private getPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async upload(buffer: Buffer, key: string, contentType = 'image/jpeg'): Promise<string> {
    if (!this.s3Client) {
      console.warn('S3 not configured, returning mock URL');
      return this.getPublicUrl(key);
    }

    const { PutObjectCommand } = await import('@aws-sdk/client-s3');

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return this.getPublicUrl(key);
  }

  async delete(key: string): Promise<void> {
    if (!this.s3Client) {
      return;
    }

    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  /**
   * Extracts the S3 object key from a URL, validating it belongs to this bucket.
   * Returns null if the URL is invalid, malformed, or points to a different host.
   */
  extractKey(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    try {
      const parsed = new URL(url);
      const expectedHost = `${this.bucket}.s3.${this.region}.amazonaws.com`;
      if (parsed.hostname !== expectedHost) return null;
      const key = parsed.pathname.slice(1); // remove leading /
      return key || null;
    } catch {
      return null;
    }
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!this.s3Client) {
      console.warn('S3 not configured, returning public URL instead of signed URL');
      return this.getPublicUrl(key);
    }

    try {
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error: any) {
      console.error(`Failed to generate signed URL: ${error?.message}`, error);
      return this.getPublicUrl(key);
    }
  }
}
