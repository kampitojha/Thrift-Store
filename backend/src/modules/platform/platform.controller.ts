import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsBoolean, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PlatformService } from './platform.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class FlushKeyDto { @IsString() pattern!: string; }

class BackupCreateDto { @IsOptional() @IsString() scope?: string; @IsOptional() @IsString() notes?: string; }

class MaintenanceDto {
  @IsString() action!: 'enable' | 'disable';
  @IsOptional() @IsString() message?: string;
  @IsOptional() @IsString() whitelistAdmins?: string;
  @IsOptional() @IsString() estimatedCompletion?: string;
}

class WebhookRetryDto { @IsOptional() @IsInt() @Type(() => Number) maxAttempts?: number; }

class JobActionDto { @IsString() action!: 'retry' | 'cancel' | 'pause' | 'resume'; }

class LogQueryDto {
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsString() service?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() sortBy?: string;
  @IsOptional() @IsString() sortOrder?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}

class RolloutUpdateDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) rolloutPercentage?: number;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString({ each: true }) userSegments?: string[];
  @IsOptional() @IsBoolean() betaOnly?: boolean;
}

class ApiExplorerDto {
  @IsString() method!: string;
  @IsString() path!: string;
  @IsOptional() body?: unknown;
}

class WebhookCreateDto {
  @IsString() provider!: string;
  @IsString() eventType!: string;
  @IsOptional() body?: unknown;
}

class AdminNotifyDto {
  @IsString() type!: string;
  @IsString() title!: string;
  @IsString() message!: string;
  @IsOptional() @IsString() severity?: string;
  @IsOptional() @IsString() category?: string;
}

@ApiTags('Platform')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller({ path: 'admin/platform', version: '1' })
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('overview')
  overview() { return this.platform.getOverview(); }

  @Get('monitoring')
  monitoring() { return this.platform.getRealtimeMonitoring(); }

  @Get('api-monitoring')
  apiMonitoring() { return this.platform.getApiMonitoring(); }

  @Get('database')
  database() { return this.platform.getDatabaseStats(); }

  @Get('redis')
  redis() { return this.platform.getRedisStats(); }

  @Post('redis/flush')
  flushRedis(@Body() dto: { confirm?: string }) { return this.platform.flushRedis(dto.confirm); }

  @Post('redis/flush-key')
  flushRedisKey(@Body() dto: FlushKeyDto) { return this.platform.flushRedisKey(dto.pattern); }

  @Post('redis/flush-category')
  flushRedisCategory(@Body() dto: { category: string; confirm?: string }) { return this.platform.flushRedisCategory(dto.category, dto.confirm); }

  @Get('queues')
  queues() { return this.platform.getQueueStats(); }

  @Get('workers')
  workers() { return this.platform.getWorkerStats(); }

  @Get('cron')
  cronJobs() { return this.platform.getCronJobs(); }

  @Post('cron/:id/run')
  runCronJob(@Param('id') id: string) { return this.platform.runCronJob(id); }

  @Post('cron/:id/toggle')
  toggleCronJob(@Param('id') id: string) { return this.platform.toggleCronJob(id); }

  @Get('cron/:id/history')
  cronJobHistory(@Param('id') id: string) { return this.platform.getCronJobHistory(id); }

  @Get('webhooks')
  webhooks(@Query() query: LogQueryDto) { return this.platform.getWebhooks(query); }

  @Post('webhooks/simulate')
  simulateWebhook(@Body() dto: WebhookCreateDto) { return this.platform.simulateWebhook(dto); }

  @Post('webhooks/:id/retry')
  retryWebhook(@Param('id') id: string, @Body() dto: WebhookRetryDto) { return this.platform.retryWebhook(id, dto.maxAttempts); }

  @Get('search')
  searchEngine() { return this.platform.getSearchEngineStats(); }

  @Post('search/reindex')
  reindexSearch(@Body() dto: { target?: string }) { return this.platform.reindexSearch(dto.target); }

  @Get('storage')
  storage() { return this.platform.getStorageStats(); }

  @Get('logs')
  logs(@Query() query: LogQueryDto) { return this.platform.getSystemLogs(query); }

  @Get('logs/export')
  exportLogs(@Query() query: LogQueryDto & { format?: string }) { return this.platform.exportLogs(query); }

  @Get('errors')
  errors(@Query() query: LogQueryDto) { return this.platform.getErrors(query); }

  @Get('security')
  security() { return this.platform.getSecurityStats(); }

  @Get('backups')
  backups(@Query() query: LogQueryDto) { return this.platform.getBackups(query); }

  @Post('backups')
  createBackup(@CurrentUser() user: AuthUser, @Body() dto: BackupCreateDto) { return this.platform.createBackup(user.id, dto); }

  @Post('backups/schedule')
  scheduleBackup(@Body() dto: { enabled: boolean; cronExpression?: string; scope?: string; retentionDays?: number }) { return this.platform.scheduleBackup(dto); }

  @Get('maintenance')
  maintenanceStatus() { return this.platform.getMaintenanceStatus(); }

  @Post('maintenance')
  toggleMaintenance(@Body() dto: MaintenanceDto) { return this.platform.toggleMaintenance(dto); }

  @Get('integrations')
  integrations() { return this.platform.getIntegrations(); }

  @Post('integrations/:name/reconnect')
  reconnectIntegration(@Param('name') name: string) { return this.platform.reconnectIntegration(name); }

  @Post('integrations/:name/test')
  testIntegration(@Param('name') name: string) { return this.platform.testIntegration(name); }

  @Get('analytics')
  analytics() { return this.platform.getAnalytics(); }

  @Get('analytics/export')
  exportAnalytics(@Query() query: { format?: string; from?: string; to?: string }) { return this.platform.exportAnalytics(query); }

  @Get('health')
  health() { return this.platform.runHealthChecks(); }

  @Get('settings')
  settings() { return this.platform.getSettings(); }

  @Patch('settings')
  updateSettings(@Body() dto: Record<string, unknown>) { return this.platform.updateSettings(dto); }

  @Get('feature-rollouts')
  featureRollouts() { return this.platform.getFeatureRollouts(); }

  @Patch('feature-rollouts/:id')
  updateFeatureRollout(@Param('id') id: string, @Body() dto: RolloutUpdateDto) { return this.platform.updateFeatureRollout(id, dto); }

  @Post('feature-rollouts/:id/rollback')
  rollbackFeature(@Param('id') id: string) { return this.platform.rollbackFeature(id); }

  @Get('feature-rollouts/:id/history')
  featureRolloutHistory(@Param('id') id: string) { return this.platform.getFeatureRolloutHistory(id); }

  @Get('environment')
  environment() { return this.platform.getEnvironmentStatus(); }

  @Get('notifications')
  adminNotifications(@Query() query: { category?: string; read?: string; page?: number; limit?: number }) { return this.platform.getAdminNotifications(query); }

  @Post('notifications')
  createAdminNotification(@Body() dto: AdminNotifyDto) { return this.platform.createAdminNotification(dto); }

  @Post('notifications/:id/read')
  markNotificationRead(@Param('id') id: string) { return this.platform.markAdminNotificationRead(id); }

  @Post('notifications/read-all')
  markAllNotificationsRead() { return this.platform.markAllAdminNotificationsRead(); }

  @Get('notifications/unread-count')
  unreadNotificationCount() { return this.platform.getUnreadNotificationCount(); }

  @Get('global-search')
  globalSearch(@Query('q') q: string, @Query('types') types?: string) { return this.platform.getGlobalSearch(q, types); }

  @Get('rate-limits')
  rateLimits() { return this.platform.getRateLimitStats(); }

  @Get('developer/queues')
  developerQueues() { return this.platform.getDeveloperQueueStats(); }

  @Get('developer/cache')
  developerCache() { return this.platform.getDeveloperCacheInfo(); }

  @Post('developer/api-explorer')
  apiExplorer(@Body() dto: ApiExplorerDto) { return this.platform.apiExplorer(dto); }

  @Get('jobs')
  jobs(@Query() query: LogQueryDto) { return this.platform.getJobs(query); }

  @Post('jobs/:id/action')
  jobAction(@Param('id') id: string, @Body() dto: JobActionDto) { return this.platform.jobAction(id, dto.action); }

  @Get('audit-logs')
  auditLogs(@Query() query: LogQueryDto) { return this.platform.getAuditLogs(query); }

  @Get('audit-logs/stats')
  auditLogStats() { return this.platform.getAuditLogStats(); }

  @Delete('logs')
  clearLogs(@Body() dto: { olderThanDays?: number; level?: string }) { return this.platform.clearLogs(dto); }
}
