import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { RefundsService } from './refunds.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Refunds')
@ApiBearerAuth()
@Controller({ path: 'refunds', version: '1' })
export class RefundsController {
  constructor(private readonly refunds: RefundsService) {}

  @Get()
  @ApiOperation({ summary: 'My refunds (buyer)' })
  myRefunds(@CurrentUser() user: AuthUser, @Query() q: PaginationDto) {
    return this.refunds.myRefunds(user.id, q.page, q.limit);
  }

  @Get('seller')
  @ApiOperation({ summary: 'Seller refunds' })
  sellerRefunds(@CurrentUser() user: AuthUser, @Query() q: PaginationDto) {
    return this.refunds.sellerRefunds(user.id, q.page, q.limit);
  }

  @Get('admin')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'All refunds (admin)' })
  adminList(
    @Query() q: PaginationDto,
    @Query('status') status?: string,
  ) {
    return this.refunds.adminList(q.page, q.limit, status);
  }

  @Get('admin/summary')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Refund summary (admin)' })
  adminSummary() {
    return this.refunds.getSummary();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Refund details' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.refunds.findOne(id);
  }
}
