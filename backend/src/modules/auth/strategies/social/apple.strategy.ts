import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(config: ConfigService) {
    const clientID = config.get<string>('appleClientId') || process.env.APPLE_CLIENT_ID || '';
    const teamID = config.get<string>('appleTeamId') || process.env.APPLE_TEAM_ID || '';
    if (!clientID) {
      Logger.warn('Apple OAuth not configured — skipping strategy');
    }
    super({
      clientID: clientID || 'unused',
      teamID: teamID || 'unused',
      keyID: config.get<string>('appleKeyId') || process.env.APPLE_KEY_ID || 'unused',
      keyFilePath: config.get<string>('appleKeyFilePath') || process.env.APPLE_KEY_FILE_PATH || '',
      callbackURL: config.get<string>('appleCallbackUrl') || process.env.APPLE_CALLBACK_URL || 'http://localhost:4000/api/v1/auth/apple/callback',
      scope: ['name', 'email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    _idToken: string,
    profile: { id: string; email?: string; name?: { firstName?: string; lastName?: string } },
    done: (err: Error | null, user?: Record<string, unknown>) => void,
  ) {
    const user = {
      email: profile.email || '',
      firstName: profile.name?.firstName || '',
      lastName: profile.name?.lastName || '',
      appleId: profile.id,
    };
    done(null, user);
  }
}
