import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { WalletService } from './wallet.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

class PayoutDto {
  @IsInt() @Min(10000) amountPaise!: number; // min ₹100
}

@ApiTags('Wallet')
@ApiBearerAuth()
@Controller({ path: 'wallet', version: '1' })
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.wallet.get(user.id);
  }

  @Get('transactions')
  txns(@CurrentUser() user: AuthUser, @Query() q: PaginationDto) {
    return this.wallet.transactions(user.id, q.page, q.limit);
  }

  @Post('payout')
  payout(@CurrentUser() user: AuthUser, @Body() dto: PayoutDto) {
    return this.wallet.requestPayout(user.id, dto.amountPaise);
  }
}
