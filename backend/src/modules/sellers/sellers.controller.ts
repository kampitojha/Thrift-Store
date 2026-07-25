import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { SellersService } from './sellers.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

class CreateStoreDto {
  @IsString() storeName!: string;
  @IsOptional() @IsString() storeDescription?: string;
  @IsOptional() @IsString() businessType?: string;
}

class UpdateStoreDto {
  @IsOptional() @IsString() storeName?: string;
  @IsOptional() @IsString() storeDescription?: string;
  @IsOptional() @IsString() storeLogoUrl?: string;
  @IsOptional() @IsString() storeBannerUrl?: string;
  @IsOptional() @IsString() businessType?: string;
  @IsOptional() @IsBoolean() isVacationMode?: boolean;
  @IsOptional() @IsString() vacationMessage?: string;
  @IsOptional() policies?: Record<string, unknown>;
}

class VerificationDto {
  @IsString() type!: string;
  @IsString() documentUrl!: string;
}

@ApiTags('Sellers')
@Controller({ path: 'sellers', version: '1' })
export class SellersController {
  constructor(private readonly sellers: SellersService) {}

  @Post('store')
  @ApiBearerAuth()
  createStore(@CurrentUser() user: AuthUser, @Body() dto: CreateStoreDto) {
    return this.sellers.createStore(user.id, dto);
  }

  @Patch('store')
  @ApiBearerAuth()
  updateStore(@CurrentUser() user: AuthUser, @Body() dto: UpdateStoreDto) {
    return this.sellers.updateStore(user.id, dto);
  }

  @Public()
  @Get('store/:slug')
  getStore(@Param('slug') slug: string) {
    return this.sellers.getStore(slug);
  }

  @Public()
  @Get('store/:slug/listings')
  getStoreListings(
    @Param('slug') slug: string,
    @Query() q: PaginationDto,
    @Query('status') status?: string,
  ) {
    return this.sellers.getStoreListings(slug, q.page, q.limit, status);
  }

  @Post('store/:slug/follow')
  @ApiBearerAuth()
  followStore(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.sellers.followStore(user.id, slug);
  }

  @Delete('store/:slug/follow')
  @ApiBearerAuth()
  unfollowStore(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.sellers.unfollowStore(user.id, slug);
  }

  @Get('dashboard')
  @ApiBearerAuth()
  dashboard(@CurrentUser() user: AuthUser) {
    return this.sellers.dashboard(user.id);
  }

  @Post('verification')
  @ApiBearerAuth()
  verify(@CurrentUser() user: AuthUser, @Body() dto: VerificationDto) {
    return this.sellers.submitVerification(user.id, dto.type, dto.documentUrl);
  }

  // ── Analytics ──

  @Get('analytics/revenue')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revenue analytics by period' })
  revenueAnalytics(@CurrentUser() user: AuthUser, @Query('period') period?: string) {
    return this.sellers.revenueAnalytics(user.id, (period || 'monthly') as 'daily' | 'weekly' | 'monthly');
  }

  @Get('analytics/top-products')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Top & worst performing products' })
  topProducts(@CurrentUser() user: AuthUser, @Query('limit') limit?: number) {
    return this.sellers.topProducts(user.id, limit || 10);
  }

  @Get('analytics/category-performance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Category performance breakdown' })
  categoryPerformance(@CurrentUser() user: AuthUser) {
    return this.sellers.categoryPerformance(user.id);
  }

  @Get('analytics/overview')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Analytics overview snapshot' })
  analyticsOverview(@CurrentUser() user: AuthUser) {
    return this.sellers.analyticsOverview(user.id);
  }

  // ── Customers ──

  @Get('customers')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List buyers who purchased from this seller' })
  customers(@CurrentUser() user: AuthUser, @Query() q: PaginationDto) {
    return this.sellers.customers(user.id, q.page, q.limit);
  }

  @Get('customers/:userId/orders')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific buyer\'s order history with this seller' })
  customerOrders(@CurrentUser() user: AuthUser, @Param('userId') buyerId: string, @Query() q: PaginationDto) {
    return this.sellers.customerOrders(user.id, buyerId, q.page, q.limit);
  }

  // ── Followers ──

  @Get('followers')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List store followers' })
  followers(@CurrentUser() user: AuthUser, @Query() q: PaginationDto) {
    return this.sellers.followers(user.id, q.page, q.limit);
  }

  // ── Store settings ──

  @Get('settings')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all store settings' })
  getSettings(@CurrentUser() user: AuthUser) {
    return this.sellers.getSettings(user.id);
  }

  @Patch('settings')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update store settings' })
  updateSettings(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.sellers.updateSettings(user.id, body);
  }

  @Post('featured/:productId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set featured product' })
  setFeatured(@CurrentUser() user: AuthUser, @Param('productId') productId: string) {
    return this.sellers.setFeatured(user.id, productId);
  }

  @Delete('featured/:productId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove featured product' })
  removeFeatured(@CurrentUser() user: AuthUser, @Param('productId') productId: string) {
    return this.sellers.removeFeatured(user.id, productId);
  }

  // ── Inventory alerts ──

  @Get('inventory/alerts')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get inventory alerts (low stock, out of stock)' })
  inventoryAlerts(@CurrentUser() user: AuthUser) {
    return this.sellers.inventoryAlerts(user.id);
  }
}
