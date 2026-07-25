import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller({ path: 'invoices', version: '1' })
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Post('generate/:orderId')
  @ApiOperation({ summary: 'Generate invoice for an order' })
  generate(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.invoices.generate(orderId);
  }

  @Get()
  @ApiOperation({ summary: 'List my invoices' })
  myInvoices(@CurrentUser() user: AuthUser, @Query() q: PaginationDto) {
    return this.invoices.myInvoices(user.id, q.page, q.limit);
  }

  @Get('seller')
  @ApiOperation({ summary: 'List seller invoices' })
  sellerInvoices(@CurrentUser() user: AuthUser, @Query() q: PaginationDto) {
    return this.invoices.sellerInvoices(user.id, q.page, q.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice details' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoices.findOne(id);
  }
}
