import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../config/redis.module';
import { RegisterDto, LoginDto } from './dto/auth.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async register(dto: RegisterDto, meta?: { ip?: string; userAgent?: string }) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email.toLowerCase() }, { username: dto.username.toLowerCase() }],
      },
    });
    if (existing) {
      throw new ConflictException(
        existing.email === dto.email.toLowerCase()
          ? 'Email already registered'
          : 'Username already taken',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const referralCode = this.generateReferralCode(dto.username);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        username: dto.username.toLowerCase(),
        displayName: dto.displayName || dto.username,
        passwordHash,
        role: 'BUYER',
        status: 'PENDING_VERIFICATION',
        profile: { create: {} },
        wallet: { create: {} },
        loyaltyAccount: { create: {} },
        cart: { create: {} },
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        avatarUrl: true,
      },
    });

    await this.prisma.referralCode.create({
      data: { userId: user.id, code: referralCode },
    });

    if (dto.referralCode) {
      await this.applyReferral(user.id, dto.referralCode).catch((e) =>
        this.logger.warn(`Referral failed: ${e.message}`),
      );
    }

    await this.prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        success: true,
      },
    });

    const tokens = await this.issueTokens(user);

    return { user, ...tokens };
  }

  private readonly LOCKOUT_THRESHOLD = 5;
  private readonly LOCKOUT_DURATION = 15 * 60; // 15 minutes in seconds

  async login(dto: LoginDto, meta?: { ip?: string; userAgent?: string }) {
    const email = dto.email.toLowerCase();
    const lockoutKey = `lockout:${email}`;

    // Check account lockout
    const isLocked = await this.redis.get<number>(lockoutKey);
    if (isLocked) {
      const remaining = await this.redis.ttl(lockoutKey);
      throw new UnauthorizedException(`Account temporarily locked. Try again in ${Math.ceil(remaining / 60)} minutes.`);
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account is suspended');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.prisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress: meta?.ip,
          userAgent: meta?.userAgent,
          success: false,
        },
      });

      // Increment failed attempts (1h TTL on first attempt)
      const attemptsKey = `login_attempts:${email}`;
      const attempts = await this.redis.incr(attemptsKey, 3600);
      if (attempts >= this.LOCKOUT_THRESHOLD) {
        await this.redis.set(lockoutKey, 1, this.LOCKOUT_DURATION);
        await this.redis.del(attemptsKey);
      }

      throw new UnauthorizedException('Invalid email or password');
    }

    // Clear failed attempts on success
    await this.redis.del(`login_attempts:${email}`);
    await this.redis.del(lockoutKey);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        success: true,
      },
    });

    const tokens = await this.issueTokens(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.username,
      },
      dto.rememberMe,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.userSession.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // rotate refresh token
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens({
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      username: session.user.username,
    });
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.userSession.updateMany({
        where: { userId, refreshToken, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.prisma.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { ok: true };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    // Always return success to prevent email enumeration
    if (!user) return { ok: true };

    const token = randomBytes(32).toString('hex');
    await this.redis.set(`pwd_reset:${token}`, user.id, 3600);

    // Email would be sent via Resend here
    this.logger.log(`Password reset token for ${email}: ${token.slice(0, 8)}...`);

    return { ok: true };
  }

  async resetPassword(token: string, password: string) {
    const userId = await this.redis.get<string>(`pwd_reset:${token}`);
    if (!userId) throw new BadRequestException('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await this.redis.del(`pwd_reset:${token}`);
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { ok: true };
  }

  async verifyEmail(token: string) {
    const userId = await this.redis.get<string>(`email_verify:${token}`);
    if (!userId) throw new BadRequestException('Invalid or expired verification token');
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
    });
    await this.redis.del(`email_verify:${token}`);
    return { ok: true };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || user.emailVerifiedAt) return { ok: true };
    const token = randomBytes(32).toString('hex');
    await this.redis.set(`email_verify:${token}`, user.id, 86400);
    this.logger.log(`Verification email for ${email}: ${token.slice(0, 8)}...`);
    return { ok: true };
  }

  async socialLogin(profile: { email: string; firstName?: string; lastName?: string; googleId?: string; appleId?: string }) {
    const { email, firstName, lastName, googleId, appleId } = profile;
    if (!email) throw new BadRequestException('Email required for social login');

    let user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20);
      const username = await this.generateUniqueUsername(baseUsername);
      user = await this.prisma.user.create({
        data: {
          email: email.toLowerCase(),
          username,
          displayName: `${firstName || ''} ${lastName || ''}`.trim() || username,
          role: 'BUYER',
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
          avatarUrl: undefined,
          profile: { create: {} },
          wallet: { create: {} },
          loyaltyAccount: { create: {} },
          cart: { create: {} },
        },
      });
    } else if (!user.emailVerifiedAt) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
      });
    }

    const tokens = await this.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    };
  }

  async loginHistory(userId: string) {
    return this.prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        location: true,
        success: true,
        createdAt: true,
      },
    });
  }

  private async generateUniqueUsername(base: string): Promise<string> {
    const suffix = randomBytes(3).toString('hex');
    const username = `${base}_${suffix}`;
    const exists = await this.prisma.user.findUnique({ where: { username } });
    if (exists) return this.generateUniqueUsername(base);
    return username;
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        firstName: true,
        lastName: true,
        bio: true,
        avatarUrl: true,
        coverUrl: true,
        role: true,
        status: true,
        isVerified: true,
        city: true,
        state: true,
        country: true,
        phone: true,
        emailVerifiedAt: true,
        twoFactorEnabled: true,
        profile: true,
        sellerProfile: {
          select: {
            storeName: true,
            storeSlug: true,
            verificationStatus: true,
            rating: true,
            totalSales: true,
          },
        },
        wallet: { select: { balancePaise: true, currency: true } },
        loyaltyAccount: { select: { points: true, level: true, badges: true } },
      },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private async issueTokens(
    user: { id: string; email: string; role: string; username: string },
    rememberMe = false,
  ) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
    };

    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = randomBytes(48).toString('hex');
    const days = rememberMe ? 60 : 30;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get('jwtExpiresIn', '7d'),
      tokenType: 'Bearer',
    };
  }

  private generateReferralCode(username: string) {
    return `${username.slice(0, 4).toUpperCase()}${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private async applyReferral(refereeId: string, code: string) {
    const ref = await this.prisma.referralCode.findUnique({ where: { code } });
    if (!ref || ref.userId === refereeId) return;

    await this.prisma.referral.create({
      data: {
        referrerId: ref.userId,
        refereeId,
        code,
        status: 'pending',
      },
    });
    await this.prisma.referralCode.update({
      where: { id: ref.id },
      data: { uses: { increment: 1 } },
    });
  }
}
