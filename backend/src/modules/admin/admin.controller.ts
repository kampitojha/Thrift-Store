import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AdminService } from './admin.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

class ModerateDto {
  @IsString() action!: string;
  @IsOptional() @IsString() notes?: string;
}

class ResolveDto {
  @IsString() action!: string;
  @IsOptional() @IsString() resolution?: string;
}

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  dashboard() { return this.admin.dashboardStats(); }

  @Get('search')
  search(@Query('q') q: string) { return this.admin.globalSearch(q); }

  @Get('activity')
  activity(@Query() q: PaginationDto) { return this.admin.activityFeed(q.page, q.limit); }

  @Get('fraud')
  fraud() { return this.admin.fraudAlerts(); }

  // ── Activity Feed ──
  @Get('activity-feed')
  activityFeed(@Query() q: PaginationDto) {
    return this.admin.activityFeed(q.page, q.limit);
  }

  // ── Users ──
  @Get('users')
  users(@Query() q: PaginationDto, @Query('q') search?: string, @Query('role') role?: string, @Query('status') status?: string) {
    return this.admin.listUsers(q.page, q.limit, { q: search, role, status });
  }

  // ── Export Users ──
  @Get('users/export')
  @Roles('ADMIN', 'SUPER_ADMIN')
  exportUsers(@Query('format') format: 'csv' | 'json') {
    return this.admin.exportUsers(format);
  }

  // ── Bulk Actions ──
  @Post('users/bulk')
  @Roles('ADMIN', 'SUPER_ADMIN')
  bulkUserAction(@Body() body: { userIds: string[]; action: string; value?: string }) {
    return this.admin.bulkUserAction(body.userIds, body.action, body.value);
  }

  @Get('users/:id')
  userDetail(@Param('id') id: string) { return this.admin.getUserDetail(id); }

  @Patch('users/:id/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  setUserStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { status: string }) {
    return this.admin.setUserStatus(user.id, id, body.status);
  }

  @Patch('users/:id/role')
  @Roles('SUPER_ADMIN')
  setUserRole(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { role: string }) {
    return this.admin.setUserRole(user.id, id, body.role);
  }

  @Delete('users/:id')
  @Roles('SUPER_ADMIN')
  deleteUser(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.admin.deleteUser(user.id, id);
  }

  // ── User Restore ──
  @Patch('users/:id/restore')
  @Roles('ADMIN', 'SUPER_ADMIN')
  restoreUser(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.admin.restoreUser(user.id, id);
  }

  // ── User Reset Password ──
  @Post('users/:id/reset-password')
  @Roles('SUPER_ADMIN')
  resetUserPassword(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { newPassword: string }) {
    return this.admin.resetUserPassword(user.id, id, body.newPassword);
  }

  // ── Force Logout ──
  @Post('users/:id/force-logout')
  @Roles('ADMIN', 'SUPER_ADMIN')
  forceLogout(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.admin.forceLogout(user.id, id);
  }

  // ── Sellers ──
  @Get('sellers')
  sellers(@Query() q: PaginationDto, @Query('q') search?: string, @Query('verification') verification?: string) {
    return this.admin.listSellers(q.page, q.limit, { q: search, verification });
  }

  @Post('sellers/bulk')
  @Roles('ADMIN', 'SUPER_ADMIN')
  bulkSellerAction(@Body() body: { sellerIds: string[]; action: string; value?: string }) {
    return this.admin.bulkSellerAction(body.sellerIds, body.action, body.value);
  }

  @Get('sellers/:id')
  sellerDetail(@Param('id') id: string) { return this.admin.getSellerDetail(id); }

  @Patch('sellers/:id/verify')
  @Roles('ADMIN', 'SUPER_ADMIN')
  verifySeller(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { action: 'approve' | 'reject'; notes?: string }) {
    return this.admin.verifySeller(user.id, id, body.action, body.notes);
  }

  // ── Seller suspend/ban/restore ──
  @Patch('sellers/:id/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  setSellerStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { status: 'SUSPENDED' | 'BANNED' | 'ACTIVE' }) {
    return this.admin.setSellerStatus(user.id, id, body.status);
  }

  // ── Products ──
  @Get('products')
  products(@Query() q: PaginationDto, @Query('q') search?: string, @Query('status') status?: string) {
    return this.admin.listProducts(q.page, q.limit, { q: search, status });
  }

  @Get('products/pending')
  pending(@Query() q: PaginationDto) { return this.admin.listProducts(q.page, q.limit, { status: 'PENDING_REVIEW' }); }

  @Post('products/bulk')
  @Roles('ADMIN', 'SUPER_ADMIN')
  bulkProductAction(@Body() body: { productIds: string[]; action: string; value?: string }) {
    return this.admin.bulkProductAction(body.productIds, body.action, body.value);
  }

  @Get('products/:id')
  productDetail(@Param('id') id: string) { return this.admin.getProductDetail(id); }

  @Patch('products/:id/moderate')
  moderate(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ModerateDto) {
    return this.admin.moderateProduct(user.id, id, dto.action, dto.notes);
  }

  // ── Trending ──
  @Patch('products/:id/trending')
  @Roles('ADMIN', 'SUPER_ADMIN')
  toggleTrending(@Param('id') id: string, @Body() body: { isTrending: boolean }) {
    return this.admin.toggleTrending(id, body.isTrending);
  }

  // ── Orders ──
  @Get('orders')
  orders(@Query() q: PaginationDto, @Query('q') search?: string, @Query('status') status?: string) {
    return this.admin.listOrders(q.page, q.limit, { q: search, status });
  }

  @Get('orders/:id')
  orderDetail(@Param('id') id: string) { return this.admin.getOrderDetail(id); }

  @Patch('orders/:id/cancel')
  @Roles('ADMIN', 'SUPER_ADMIN')
  cancelOrder(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.admin.cancelOrder(user.id, id, body.reason);
  }

  // ── Disputes ──
  @Get('disputes')
  disputes(@Query() q: PaginationDto, @Query('status') status?: string) {
    return this.admin.listDisputes(q.page, q.limit, { status });
  }

  @Patch('disputes/:id/resolve')
  @Roles('ADMIN', 'SUPER_ADMIN')
  resolveDispute(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ResolveDto) {
    return this.admin.resolveDispute(user.id, id, dto.action, dto.resolution);
  }

  // ── Reports ──
  @Get('reports')
  reports(@Query() q: PaginationDto, @Query('status') status?: string) {
    return this.admin.listReports(q.page, q.limit, { status });
  }

  @Patch('reports/:id/resolve')
  @Roles('ADMIN', 'SUPER_ADMIN')
  resolveReport(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ResolveDto) {
    return this.admin.resolveReport(user.id, id, dto.action, dto.resolution);
  }

  // ── Refunds ──
  @Get('refunds')
  refunds(@Query() q: PaginationDto, @Query('status') status?: string) {
    return this.admin.listRefunds(q.page, q.limit, status);
  }

  // ── Refund Process ──
  @Patch('refunds/:id/process')
  @Roles('ADMIN', 'SUPER_ADMIN')
  processRefund(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { action: 'approve' | 'reject' | 'partial'; amountPaise?: number; notes?: string }) {
    return this.admin.processRefund(user.id, id, body.action, body.amountPaise, body.notes);
  }

  // ── Returns ──
  @Get('returns')
  returns(@Query() q: PaginationDto, @Query('status') status?: string) {
    return this.admin.listReturns(q.page, q.limit, status);
  }

  // ── Return Process ──
  @Patch('returns/:id/process')
  @Roles('ADMIN', 'SUPER_ADMIN')
  processReturn(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { action: 'approve' | 'reject'; notes?: string }) {
    return this.admin.processReturn(user.id, id, body.action, body.notes);
  }

  // ── Coupons ──
  @Get('coupons')
  coupons(@Query() q: PaginationDto) { return this.admin.listCoupons(q.page, q.limit); }

  @Post('coupons')
  @Roles('ADMIN', 'SUPER_ADMIN')
  createCoupon(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.admin.createCoupon(user.id, body);
  }

  @Patch('coupons/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateCoupon(@Param('id') id: string, @Body() body: any) {
    return this.admin.updateCoupon(id, body);
  }

  @Delete('coupons/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  deleteCoupon(@Param('id') id: string) {
    return this.admin.deleteCoupon(id);
  }

  // ── Categories ──
  @Get('categories')
  categories(@Query() q: PaginationDto, @Query('q') search?: string) {
    return this.admin.listCategories(q.page, q.limit, search);
  }

  @Get('categories/:id')
  getCategory(@Param('id') id: string) { return this.admin.getCategory(id); }

  @Post('categories')
  @Roles('ADMIN', 'SUPER_ADMIN')
  createCategory(@Body() body: any) { return this.admin.createCategory(body); }

  @Patch('categories/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateCategory(@Param('id') id: string, @Body() body: any) { return this.admin.updateCategory(id, body); }

  @Delete('categories/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  deleteCategory(@Param('id') id: string) { return this.admin.deleteCategory(id); }

  // ── Audit Logs ──
  @Get('audit-logs')
  auditLogs(@Query() q: PaginationDto, @Query('userId') userId?: string, @Query('action') action?: string, @Query('entityType') entityType?: string) {
    return this.admin.listAuditLogs(q.page, q.limit, { userId, action, entityType });
  }

  // ── Notifications ──
  @Get('notifications')
  adminNotifications(@Query() q: PaginationDto) {
    return this.admin.listAdminNotifications(q.page, q.limit);
  }

  @Post('notifications/read')
  markNotificationsRead(@Body() body: { ids?: string[]; all?: boolean }) {
    return this.admin.markNotificationsRead(body.ids, body.all);
  }

  // ── Roles ──
  @Get('roles')
  listRoles() {
    return this.admin.listRoles();
  }

  @Post('roles')
  @Roles('SUPER_ADMIN')
  createRole(@Body() body: { name: string; description?: string; permissions: string[] }) {
    return this.admin.createRole(body.name, body.description, body.permissions);
  }

  @Patch('roles/:id')
  @Roles('SUPER_ADMIN')
  updateRole(@Param('id') id: string, @Body() body: { name?: string; description?: string; permissions?: string[] }) {
    return this.admin.updateRole(id, body);
  }

  @Delete('roles/:id')
  @Roles('SUPER_ADMIN')
  deleteRole(@Param('id') id: string) {
    return this.admin.deleteRole(id);
  }

  // ── Permissions ──
  @Get('permissions')
  listPermissions() {
    return this.admin.listPermissions();
  }
}
