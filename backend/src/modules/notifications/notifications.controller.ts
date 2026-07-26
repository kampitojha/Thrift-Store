import { Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() q: PaginationDto,
    @Query('type') type?: string,
  ) {
    return this.notifications.list(user.id, q.page, q.limit, type as any);
  }

  @Get('unread/count')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.notifications.getUnreadCount(user.id);
  }

  @Patch('read')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markRead(user.id);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.delete(user.id, id);
  }
}
