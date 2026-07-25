import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

class CreateOrderDto {
  @IsString()
  shippingAddressId!: string;

  @IsOptional()
  @IsString()
  billingAddressId?: string;

  @IsOptional()
  @IsString()
  shippingMethod?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

@ApiTags('Orders')
@ApiBearerAuth()
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.createFromCart(user.id, dto);
  }

  @Get()
  myOrders(@CurrentUser() user: AuthUser, @Query() q: PaginationDto) {
    return this.orders.findBuyerOrders(user.id, q.page, q.limit);
  }

  @Get('seller')
  sellerOrders(
    @CurrentUser() user: AuthUser,
    @Query() q: PaginationDto,
    @Query('status') status?: string,
  ) {
    return this.orders.findSellerOrders(user.id, q.page, q.limit, status);
  }

  @Get(':id')
  one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.findOne(id, user.id, user.role);
  }

  @Patch(':id/status')
  status(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orders.updateStatus(id, user.id, dto.status, dto.note);
  }

  // ── Seller Actions ──

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept an order' })
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.sellerAction(user.id, id, 'CONFIRMED', 'Order accepted');
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject an order' })
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.orders.sellerAction(user.id, id, 'CANCELLED', body.reason || 'Rejected by seller');
  }

  @Post(':id/prepare')
  @ApiOperation({ summary: 'Mark order as being prepared' })
  prepare(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.sellerAction(user.id, id, 'PACKED', 'Order being prepared');
  }

  @Post(':id/ship')
  @ApiOperation({ summary: 'Mark order as shipped' })
  ship(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.sellerAction(user.id, id, 'SHIPPED', 'Order shipped');
  }

  @Post(':id/deliver')
  @ApiOperation({ summary: 'Mark order as delivered' })
  deliver(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.sellerAction(user.id, id, 'DELIVERED', 'Order delivered');
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order (seller)' })
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.orders.sellerAction(user.id, id, 'CANCELLED', body.reason || 'Cancelled by seller');
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get order timeline' })
  timeline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.getTimeline(user.id, id);
  }

  @Post(':id/timeline')
  @ApiOperation({ summary: 'Add timeline note' })
  addTimelineNote(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { note: string }) {
    return this.orders.addTimelineNote(user.id, id, body.note);
  }

  @Get(':id/invoice')
  @ApiOperation({ summary: 'Get order invoice data' })
  invoice(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.getInvoice(user.id, id);
  }

  // ── Buyer Actions ──

  @Post('buyer/:id/cancel')
  @ApiOperation({ summary: 'Cancel order as buyer' })
  buyerCancel(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.orders.buyerCancel(id, user.id, body.reason);
  }

  @Get('buyer/search')
  @ApiOperation({ summary: 'Search buyer orders' })
  searchBuyerOrders(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.orders.searchBuyerOrders(user.id, { q, status, from, to, sortBy, sortOrder, page, limit });
  }

  @Post(':id/reorder')
  @ApiOperation({ summary: 'Reorder from previous order' })
  reorder(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.reorder(user.id, id);
  }

  @Get('analytics/seller')
  @ApiOperation({ summary: 'Order analytics for seller' })
  orderAnalytics(@CurrentUser() user: AuthUser) {
    return this.orders.getOrderAnalytics(user.id);
  }
}
