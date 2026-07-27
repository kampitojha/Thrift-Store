import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { TwoFactorService } from './two-factor.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class Verify2faDto {
  code!: string;
  secret?: string;
}

@ApiTags('Two-Factor Authentication')
@ApiBearerAuth()
@Controller({ path: 'auth/2fa', version: '1' })
export class TwoFactorController {
  constructor(private readonly twofa: TwoFactorService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check 2FA status' })
  async status(@CurrentUser() user: AuthUser) {
    const enabled = await this.twofa.isEnabled(user.id);
    return { enabled };
  }

  @Post('setup')
  @ApiOperation({ summary: 'Start 2FA setup' })
  async setup(@CurrentUser() user: AuthUser) {
    const secret = speakeasy.generateSecret({ name: `Thrift Store:${user.email}` });
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || '');
    return { secret: secret.base32, qrCodeUrl };
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify and enable 2FA' })
  async verify(@CurrentUser() user: AuthUser, @Body() dto: Verify2faDto) {
    const verified = speakeasy.totp.verify({
      secret: dto.secret || '',
      encoding: 'base32',
      token: dto.code,
      window: 1,
    });
    if (!verified) {
      return { ok: false, message: 'Invalid code' };
    }
    const backupCodes = await this.twofa.enable(user.id, dto.secret || '');
    return { ok: true, backupCodes };
  }

  @Post('disable')
  @ApiOperation({ summary: 'Disable 2FA' })
  async disable(@CurrentUser() user: AuthUser, @Body() dto: Verify2faDto) {
    const enabled = await this.twofa.isEnabled(user.id);
    if (!enabled) return { ok: true };
    const secret = await this.twofa.getSecret(user.id);
    if (secret) {
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: dto.code,
        window: 1,
      });
      if (!verified) {
        return { ok: false, message: 'Invalid code' };
      }
    }
    await this.twofa.disable(user.id);
    return { ok: true };
  }
}
