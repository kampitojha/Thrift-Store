import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(config: ConfigService) {
    const clientID = config.get<string>('googleClientId') || process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = config.get<string>('googleClientSecret') || process.env.GOOGLE_CLIENT_SECRET || '';
    if (!clientID) {
      Logger.warn('Google OAuth not configured — skipping strategy');
    }
    super({
      clientID: clientID || 'unused',
      clientSecret: clientSecret || 'unused',
      callbackURL: config.get<string>('googleCallbackUrl') || process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: { emails?: Array<{ value: string }>; name?: { givenName?: string; familyName?: string }; photos?: Array<{ value: string }>; id: string },
    done: VerifyCallback,
  ) {
    const { emails, name, photos, id } = profile;
    const user = {
      email: emails?.[0]?.value || '',
      firstName: name?.givenName || '',
      lastName: name?.familyName || '',
      avatarUrl: photos?.[0]?.value || '',
      googleId: id,
    };
    done(null, user);
  }
}
