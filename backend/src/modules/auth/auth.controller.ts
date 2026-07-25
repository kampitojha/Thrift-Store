import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register with email' })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.auth.register(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login with email/password' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  logout(@CurrentUser() user: AuthUser, @Body() body: RefreshTokenDto) {
    return this.auth.logout(user.id, body.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: { token: string }) {
    return this.auth.verifyEmail(dto.token);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  resendVerification(@Body() dto: { email: string }) {
    return this.auth.resendVerification(dto.email);
  }

  @Public()
  @Get('google')
  @ApiOperation({ summary: 'Login with Google' })
  googleAuth() {
    // Redirects to Google OAuth — handled by passport
    return { message: 'Redirecting to Google…' };
  }

  @Public()
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  googleCallback(@Req() req: Request) {
    return this.auth.socialLogin((req as any).user);
  }

  @Public()
  @Get('apple')
  @ApiOperation({ summary: 'Login with Apple' })
  appleAuth() {
    return { message: 'Redirecting to Apple…' };
  }

  @Public()
  @Get('apple/callback')
  @ApiOperation({ summary: 'Apple OAuth callback' })
  appleCallback(@Req() req: Request) {
    return this.auth.socialLogin((req as any).user);
  }

  @Get('login-history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get login history' })
  loginHistory(@CurrentUser() user: AuthUser) {
    return this.auth.loginHistory(user.id);
  }
}
