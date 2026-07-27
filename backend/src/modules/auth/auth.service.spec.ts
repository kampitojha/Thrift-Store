import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../config/redis.module';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let redis: any;
  let jwt: any;
  let config: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@test.com',
    username: 'testuser',
    displayName: 'Test User',
    passwordHash: 'hashed_password',
    role: 'BUYER',
    status: 'ACTIVE',
    avatarUrl: null,
    coverUrl: null,
    firstName: null,
    lastName: null,
    bio: null,
    city: null,
    state: null,
    country: null,
    phone: null,
    isVerified: false,
    emailVerifiedAt: null,
    twoFactorEnabled: false,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    profile: { id: 'prof-1', itemsSold: 0, rating: 0 },
    sellerProfile: null,
    wallet: { balancePaise: 0, currency: 'INR' },
    loyaltyAccount: { points: 0, level: 1, badges: [] },
    _count: { ordersAsBuyer: 0, wishlistItems: 0 },
  };

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    loginHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    referralCode: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    referral: {
      create: jest.fn(),
    },
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
  };

  const mockJwt = {
    signAsync: jest.fn().mockResolvedValue('access_token'),
  };

  const mockConfig = {
    get: jest.fn((key: string, fallback?: any) => {
      if (key === 'jwtExpiresIn') return '7d';
      return fallback;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ─── Register ──────────────────────────────────────────────

  describe('register', () => {
    const dto = { email: 'Test@Test.com', username: 'TestUser', password: 'SecurePass1', displayName: 'Test', referralCode: '' };

    it('should create a new user and return tokens', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.referralCode.create.mockResolvedValue({ id: 'rc1' });

      const result = await service.register(dto, { ip: '127.0.0.1', userAgent: 'jest' });

      expect(result.user.email).toBe('test@test.com');
      expect(result.accessToken).toBe('access_token');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'test@test.com', role: 'BUYER' }),
        }),
      );
    });

    it('should throw ConflictException when email exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ email: 'test@test.com' });
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when username exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ username: 'testuser' });
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  // ─── Login ─────────────────────────────────────────────────

  describe('login', () => {
    const dto = { email: 'test@test.com', password: 'SecurePass1', rememberMe: false };

    it('should login successfully', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto, { ip: '127.0.0.1', userAgent: 'jest' });

      expect(result.accessToken).toBe('access_token');
      expect(mockRedis.del).toHaveBeenCalledWith('login_attempts:test@test.com');
    });

    it('should throw when account is locked', async () => {
      mockRedis.get.mockResolvedValue(1);
      mockRedis.ttl.mockResolvedValue(120);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw on wrong password', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockRedis.incr.mockResolvedValue(1);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should lock account after 5 failed attempts', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockRedis.incr.mockResolvedValue(5);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(mockRedis.set).toHaveBeenCalledWith('lockout:test@test.com', 1, 900);
    });

    it('should throw when user is banned', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, status: 'BANNED' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when user has no passwordHash', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: null });

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── Refresh ───────────────────────────────────────────────

  describe('refresh', () => {
    it('should rotate refresh token', async () => {
      const session = { id: 's1', userId: 'u1', refreshToken: 'old', revokedAt: null, expiresAt: new Date(Date.now() + 86400000), user: mockUser };
      mockPrisma.userSession.findUnique.mockResolvedValue(session);

      const result = await service.refresh('old');

      expect(result.accessToken).toBe('access_token');
      expect(mockPrisma.userSession.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 's1' }, data: { revokedAt: expect.any(Date) } }),
      );
    });

    it('should throw on revoked token', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue({ revokedAt: new Date(), expiresAt: new Date(Date.now() + 86400000) });
      await expect(service.refresh('bad')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw on expired token', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue({ revokedAt: null, expiresAt: new Date(Date.now() - 86400000) });
      await expect(service.refresh('bad')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw on missing session', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue(null);
      await expect(service.refresh('bad')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── Logout ────────────────────────────────────────────────

  describe('logout', () => {
    it('should revoke specific session when refreshToken provided', async () => {
      const result = await service.logout('u1', 'rt1');
      expect(result.ok).toBe(true);
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1', refreshToken: 'rt1', revokedAt: null } }),
      );
    });

    it('should revoke all sessions when no refreshToken', async () => {
      const result = await service.logout('u1');
      expect(result.ok).toBe(true);
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1', revokedAt: null } }),
      );
    });
  });

  // ─── Forgot Password ──────────────────────────────────────

  describe('forgotPassword', () => {
    it('should always return ok (prevent enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.forgotPassword('nonexistent@test.com');
      expect(result.ok).toBe(true);
    });

    it('should generate token for existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.forgotPassword('test@test.com');
      expect(result.ok).toBe(true);
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });

  // ─── Reset Password ────────────────────────────────────────

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      mockRedis.get.mockResolvedValue('user-1');
      const result = await service.resetPassword('valid-token', 'NewPass1');
      expect(result.ok).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
    });

    it('should throw on invalid token', async () => {
      mockRedis.get.mockResolvedValue(null);
      await expect(service.resetPassword('bad', 'NewPass1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Verify Email ──────────────────────────────────────────

  describe('verifyEmail', () => {
    it('should verify with valid token', async () => {
      mockRedis.get.mockResolvedValue('user-1');
      const result = await service.verifyEmail('valid-token');
      expect(result.ok).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' }, data: expect.objectContaining({ emailVerifiedAt: expect.any(Date) }) }),
      );
    });

    it('should throw on invalid token', async () => {
      mockRedis.get.mockResolvedValue(null);
      await expect(service.verifyEmail('bad')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Social Login ──────────────────────────────────────────

  describe('socialLogin', () => {
    it('should create new user on first social login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await service.socialLogin({ email: 'new@test.com', firstName: 'New', lastName: 'User' });

      expect(result.accessToken).toBe('access_token');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should login existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.socialLogin({ email: 'test@test.com' });

      expect(result.accessToken).toBe('access_token');
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should activate existing unverified user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, emailVerifiedAt: null });

      const result = await service.socialLogin({ email: 'test@test.com' });

      expect(result.accessToken).toBe('access_token');
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should throw without email', async () => {
      await expect(service.socialLogin({ email: '' })).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Me ────────────────────────────────────────────────────

  describe('me', () => {
    it('should return user profile', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.me('user-1');
      expect(result).toHaveProperty('email', 'test@test.com');
    });

    it('should throw for unknown user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.me('bad')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── Login History ─────────────────────────────────────────

  describe('loginHistory', () => {
    it('should return recent login history', async () => {
      mockPrisma.loginHistory.findMany.mockResolvedValue([{ id: 'lh1', success: true }]);
      const result = await service.loginHistory('user-1');
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].id).toBe('lh1');
    });
  });
});
