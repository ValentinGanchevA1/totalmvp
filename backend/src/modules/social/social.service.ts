// backend/src/modules/social/social.service.ts
import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialLink, SocialProvider } from '../users/entities/social-link.entity';
import { User } from '../users/entities/user.entity';
import { OAuth2Client } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';

interface SocialProfile {
  id: string;
  email?: string;
  displayName?: string;
  profileUrl?: string;
  avatarUrl?: string;
  username?: string;
  followers?: number;
  verified?: boolean;
}

@Injectable()
export class SocialService {
  private googleClient: OAuth2Client;

  constructor(
    @InjectRepository(SocialLink)
    private socialLinkRepo: Repository<SocialLink>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  // ─── Link Social Account ──────────────────────────────────────────────

  async linkSocialAccount(
    userId: string,
    provider: SocialProvider,
    token: string,
  ): Promise<SocialLink> {
    // Verify token and get profile
    const profile = await this.verifySocialToken(provider, token);

    // Check if already linked to another user
    const existing = await this.socialLinkRepo.findOne({
      where: { provider, providerId: profile.id },
      relations: ['user'],
    });

    if (existing && existing.user.id !== userId) {
      throw new ConflictException(
        `This ${provider} account is already linked to another user`,
      );
    }

    if (existing && existing.user.id === userId) {
      // Update existing link
      existing.metadata = { ...existing.metadata, verified: profile.verified };
      existing.avatarUrl = profile.avatarUrl ?? existing.avatarUrl;
      existing.displayName = profile.displayName ?? existing.displayName;
      return this.socialLinkRepo.save(existing);
    }

    // Create new link
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const socialLink = this.socialLinkRepo.create({
      user,
      provider,
      providerId: profile.id,
      email: profile.email,
      displayName: profile.displayName ?? '',
      profileUrl: profile.profileUrl,
      avatarUrl: profile.avatarUrl,
      metadata: {
        username: profile.username,
        followers: profile.followers,
        verified: profile.verified,
      },
    } as Partial<SocialLink>);

    await this.socialLinkRepo.save(socialLink);

    // Update user badges
    await this.updateSocialBadge(userId);

    return socialLink;
  }

  // ─── Token Verification by Provider ───────────────────────────────────

  private async verifySocialToken(
    provider: SocialProvider,
    token: string,
  ): Promise<SocialProfile> {
    switch (provider) {
      case SocialProvider.GOOGLE:
        return this.verifyGoogleToken(token);
      case SocialProvider.APPLE:
        return this.verifyAppleToken(token);
      case SocialProvider.FACEBOOK:
        return this.verifyFacebookToken(token);
      case SocialProvider.TWITTER:
        return this.verifyTwitterToken(token);
      case SocialProvider.INSTAGRAM:
        return this.verifyInstagramToken(token);
      default:
        throw new BadRequestException(`Unsupported provider: ${provider}`);
    }
  }

  private async verifyGoogleToken(idToken: string): Promise<SocialProfile> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) throw new Error('Invalid token');

      return {
        id: payload.sub,
        email: payload.email,
        displayName: payload.name,
        avatarUrl: payload.picture,
        verified: payload.email_verified,
      };
    } catch (error) {
      throw new BadRequestException('Invalid Google token');
    }
  }

  private async verifyAppleToken(identityToken: string): Promise<SocialProfile> {
    try {
      // Apple uses JWT - decode and verify
      const decoded = jwt.decode(identityToken, { complete: true }) as any;

      if (!decoded?.payload?.sub) {
        throw new Error('Invalid token');
      }

      // In production, verify signature with Apple's public keys
      // https://appleid.apple.com/auth/keys

      return {
        id: decoded.payload.sub,
        email: decoded.payload.email,
        displayName: decoded.payload.email?.split('@')[0],
        verified: decoded.payload.email_verified === 'true',
      };
    } catch (error) {
      throw new BadRequestException('Invalid Apple token');
    }
  }

  private async verifyFacebookToken(accessToken: string): Promise<SocialProfile> {
    try {
      const { data } = await axios.get(
        'https://graph.facebook.com/me',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { fields: 'id,name,email,picture.type(large)' },
        },
      );

      return {
        id: data.id,
        email: data.email,
        displayName: data.name,
        avatarUrl: data.picture?.data?.url,
        profileUrl: `https://facebook.com/${data.id}`,
      };
    } catch (error) {
      throw new BadRequestException('Invalid Facebook token');
    }
  }

  private async verifyTwitterToken(accessToken: string): Promise<SocialProfile> {
    try {
      // Twitter API v2
      const { data } = await axios.get('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          'user.fields': 'id,name,username,profile_image_url,verified,public_metrics',
        },
      });

      const user = data.data;
      return {
        id: user.id,
        displayName: user.name,
        username: user.username,
        avatarUrl: user.profile_image_url?.replace('_normal', '_400x400'),
        profileUrl: `https://twitter.com/${user.username}`,
        followers: user.public_metrics?.followers_count,
        verified: user.verified,
      };
    } catch (error) {
      throw new BadRequestException('Invalid Twitter token');
    }
  }

  private async verifyInstagramToken(accessToken: string): Promise<SocialProfile> {
    try {
      // Instagram Basic Display API
      const { data } = await axios.get(
        `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${accessToken}`,
      );

      return {
        id: data.id,
        username: data.username,
        displayName: data.username,
        profileUrl: `https://instagram.com/${data.username}`,
      };
    } catch (error) {
      throw new BadRequestException('Invalid Instagram token');
    }
  }

  // ─── Manage Links ─────────────────────────────────────────────────────

  async getUserSocialLinks(userId: string): Promise<SocialLink[]> {
    return this.socialLinkRepo.find({
      where: { user: { id: userId } },
      order: { linkedAt: 'DESC' },
    });
  }

  async unlinkSocialAccount(userId: string, linkId: string): Promise<void> {
    const link = await this.socialLinkRepo.findOne({
      where: { id: linkId, user: { id: userId } },
    });

    if (!link) {
      throw new BadRequestException('Social link not found');
    }

    await this.socialLinkRepo.remove(link);
    await this.updateSocialBadge(userId);
  }

  async toggleVisibility(userId: string, linkId: string): Promise<SocialLink> {
    const link = await this.socialLinkRepo.findOne({
      where: { id: linkId, user: { id: userId } },
    });

    if (!link) {
      throw new BadRequestException('Social link not found');
    }

    link.isVisible = !link.isVisible;
    return this.socialLinkRepo.save(link);
  }

  // ─── Badge Management ─────────────────────────────────────────────────

  private async updateSocialBadge(userId: string): Promise<void> {
    const links = await this.socialLinkRepo.count({
      where: { user: { id: userId } },
    });

    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) return;

    // Social badge requires at least 1 linked account
    user.badges = { ...user.badges, social: links >= 1 };

    // Recalculate verification score
    const badgeWeights: Record<keyof User['badges'], number> = { phone: 20, email: 15, photo: 35, id: 25, social: 10, premium: 5 };
    let score = 0;
    for (const key of Object.keys(badgeWeights) as Array<keyof User['badges']>) {
      if (user.badges[key]) score += badgeWeights[key];
    }
    user.verificationScore = Math.min(score, 100);

    await this.usersRepo.save(user);
  }

  // ─── Get Public Social Links (for profile view) ──────────────────────

  async getPublicSocialLinks(userId: string): Promise<Partial<SocialLink>[]> {
    const links = await this.socialLinkRepo.find({
      where: { user: { id: userId }, isVisible: true },
      select: ['id', 'provider', 'displayName', 'profileUrl', 'avatarUrl', 'metadata'],
    });

    // Sanitize - remove sensitive data
    return links.map((link) => ({
      id: link.id,
      provider: link.provider,
      displayName: link.displayName,
      profileUrl: link.profileUrl,
      username: link.metadata?.username,
      verified: link.metadata?.verified,
      followers: link.metadata?.followers,
    }));
  }
}
