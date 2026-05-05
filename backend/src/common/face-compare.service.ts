import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FaceCompareResult {
  confidence: number;
  matched: boolean;
}

@Injectable()
export class FaceCompareService {
  private rekognitionClient: any;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    if (region && accessKeyId && secretAccessKey) {
      import('@aws-sdk/client-rekognition').then(({ RekognitionClient }) => {
        this.rekognitionClient = new RekognitionClient({
          region,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });
      }).catch(() => {
        console.warn('AWS Rekognition SDK not installed, face comparison disabled');
      });
    }
  }

  async compare(sourceUrl: string, targetUrl: string): Promise<FaceCompareResult> {
    if (!this.rekognitionClient) {
      console.warn('Rekognition not configured, returning mock result');
      return { confidence: 0.9, matched: true };
    }

    try {
      const { CompareFacesCommand } = await import('@aws-sdk/client-rekognition');

      // Fetch images from URLs
      const [sourceBuffer, targetBuffer] = await Promise.all([
        this.fetchImage(sourceUrl),
        this.fetchImage(targetUrl),
      ]);

      const response = await this.rekognitionClient.send(
        new CompareFacesCommand({
          SourceImage: { Bytes: sourceBuffer },
          TargetImage: { Bytes: targetBuffer },
          SimilarityThreshold: 50,
        }),
      );

      if (response.FaceMatches && response.FaceMatches.length > 0) {
        const similarity = response.FaceMatches[0].Similarity || 0;
        return {
          confidence: similarity / 100,
          matched: similarity >= 85,
        };
      }

      return { confidence: 0, matched: false };
    } catch (error) {
      console.error('Face comparison failed:', error);
      return { confidence: 0, matched: false };
    }
  }

  private async fetchImage(url: string): Promise<Buffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
