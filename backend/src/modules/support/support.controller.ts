import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Support Tickets')
@ApiBearerAuth()
@Controller({ path: 'support', version: '1' })
@UseGuards(RolesGuard)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  // Admin endpoints
  @Get('admin/tickets')
  @Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
  list(
    @Query() q: PaginationDto,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assigneeId') assigneeId?: string,
  ) {
    return this.support.list(q.page, q.limit, { status, priority, assigneeId });
  }

  @Get('admin/stats')
  @Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
  stats() {
    return this.support.stats();
  }

  @Get('admin/tickets/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
  get(@Param('id') id: string) {
    return this.support.get(id);
  }

  @Post('admin/tickets/:id/messages')
  @Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
  adminMessage(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body('body') body: string,
  ) {
    return this.support.sendMessage(id, user.id, body, true);
  }

  @Patch('admin/tickets/:id/assign')
  @Roles('ADMIN', 'SUPER_ADMIN')
  assign(
    @Param('id') id: string,
    @Body('assigneeId') assigneeId: string,
  ) {
    return this.support.assign(id, assigneeId);
  }

  @Patch('admin/tickets/:id/resolve')
  @Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
  resolve(@Param('id') id: string) {
    return this.support.resolve(id);
  }

  @Patch('admin/tickets/:id/close')
  @Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
  close(@Param('id') id: string) {
    return this.support.close(id);
  }

  @Patch('admin/tickets/:id/reopen')
  @Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
  reopen(@Param('id') id: string) {
    return this.support.reopen(id);
  }

  // User endpoints
  @Get('my-tickets')
  myTickets(
    @CurrentUser() user: AuthUser,
    @Query() q: PaginationDto,
  ) {
    return this.support.myTickets(user.id, q.page, q.limit);
  }

  @Post('tickets')
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: { subject: string; description: string; category?: string; orderId?: string; priority?: string },
  ) {
    return this.support.create({ ...body, userId: user.id });
  }

  @Get('tickets/:id')
  userGet(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.support.get(id);
  }

  @Post('tickets/:id/messages')
  userMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('body') body: string,
  ) {
    return this.support.sendMessage(id, user.id, body, false);
  }
}
