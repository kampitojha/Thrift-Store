import { Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { PayoutsService } from './payouts.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Payouts')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller({ path: 'payouts', version: '1' })
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Post('request')
  @ApiOperation({ summary: 'Request a payout (seller)' })
  requestPayout(
    @CurrentUser() user: AuthUser,
    @Query('amountPaise') amountPaise: number,
  ) {
    return this.payouts.requestPayout(user.id, amountPaise);
  }

  @Get('history')
  @ApiOperation({ summary: 'My payout history (seller)' })
  myHistory(@CurrentUser() user: AuthUser, @Query() q: PaginationDto) {
    return this.payouts.sellerHistory(user.id, q.page, q.limit);
  }

  @Get('admin')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List all payouts (admin)' })
  adminList(
    @Query() q: PaginationDto,
    @Query('status') status?: string,
  ) {
    return this.payouts.listAdmin(q.page, q.limit, status);
  }

  @Get('admin/summary')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Payout summary (admin)' })
  adminSummary() {
    return this.payouts.getSummary();
  }

  @Patch('admin/:id/process')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Approve/reject/complete a payout (admin)' })
  processPayout(
    @Param('id') id: string,
    @Query('action') action: 'approve' | 'reject' | 'complete',
    @Query('note') note?: string,
  ) {
    return this.payouts.processPayout(id, action, note);
  }
}
