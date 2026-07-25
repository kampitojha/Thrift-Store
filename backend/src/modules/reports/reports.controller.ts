import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller({ path: 'sellers/reports', version: '1' })
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Export sales report as CSV' })
  async salesReport(@CurrentUser() user: AuthUser, @Query('from') from?: string, @Query('to') to?: string, @Res() res?: Response) {
    const csv = await this.reports.salesReport(user.id, from, to);
    if (res) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=sales_report.csv');
      res.send(csv);
    }
    return csv;
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Export inventory report as CSV' })
  async inventoryReport(@CurrentUser() user: AuthUser, @Res() res?: Response) {
    const csv = await this.reports.inventoryReport(user.id);
    if (res) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.csv');
      res.send(csv);
    }
    return csv;
  }

  @Get('orders')
  @ApiOperation({ summary: 'Export order report as CSV' })
  async orderReport(@CurrentUser() user: AuthUser, @Query('from') from?: string, @Query('to') to?: string, @Res() res?: Response) {
    const csv = await this.reports.orderReport(user.id, from, to);
    if (res) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=orders_report.csv');
      res.send(csv);
    }
    return csv;
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue summary' })
  revenueSummary(@CurrentUser() user: AuthUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.reports.revenueSummary(user.id, from, to);
  }
}
