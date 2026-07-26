import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Users')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('me/profile')
  @ApiBearerAuth()
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Get('me/addresses')
  @ApiBearerAuth()
  addresses(@CurrentUser() user: AuthUser) {
    return this.users.getAddresses(user.id);
  }

  @Post('me/addresses')
  @ApiBearerAuth()
  addAddress(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.users.addAddress(user.id, body);
  }

  @Get('me/following')
  @ApiBearerAuth()
  myFollowing(@CurrentUser() user: AuthUser, @Query() q: PaginationDto) {
    return this.users.getFollowing(user.username, q.page, q.limit);
  }

  @Public()
  @Get(':username')
  getProfile(@Param('username') username: string) {
    return this.users.findByUsername(username);
  }

  @Post(':username/follow')
  @ApiBearerAuth()
  follow(@CurrentUser() user: AuthUser, @Param('username') username: string) {
    return this.users.follow(user.id, username);
  }

  @Delete(':username/follow')
  @ApiBearerAuth()
  unfollow(@CurrentUser() user: AuthUser, @Param('username') username: string) {
    return this.users.unfollow(user.id, username);
  }

  @Public()
  @Get(':username/followers')
  followers(@Param('username') username: string, @Query() q: PaginationDto) {
    return this.users.getFollowers(username, q.page, q.limit);
  }

  @Public()
  @Get(':username/following')
  following(@Param('username') username: string, @Query() q: PaginationDto) {
    return this.users.getFollowing(username, q.page, q.limit);
  }

  @Get(':username/is-following')
  @ApiBearerAuth()
  isFollowing(@CurrentUser() user: AuthUser, @Param('username') username: string) {
    return this.users.isFollowing(user.id, username);
  }

  @Get('me/suggested')
  @ApiBearerAuth()
  suggestedUsers(@CurrentUser() user: AuthUser, @Query('limit') limit?: number) {
    return this.users.getSuggestedUsers(user.id, limit);
  }

  // ── Notification Preferences ──

  @Get('me/notification-preferences')
  @ApiBearerAuth()
  getNotificationPrefs(@CurrentUser() user: AuthUser) {
    return this.users.getNotificationPrefs(user.id);
  }

  @Patch('me/notification-preferences')
  @ApiBearerAuth()
  updateNotificationPrefs(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.users.updateNotificationPrefs(user.id, body);
  }

  // ── Privacy Settings ──

  @Get('me/privacy-settings')
  @ApiBearerAuth()
  getPrivacySettings(@CurrentUser() user: AuthUser) {
    return this.users.getPrivacySettings(user.id);
  }

  @Patch('me/privacy-settings')
  @ApiBearerAuth()
  updatePrivacySettings(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.users.updatePrivacySettings(user.id, body);
  }

  // ── Block/Unblock ──

  @Post('block')
  @ApiBearerAuth()
  blockUser(@CurrentUser() user: AuthUser, @Body() body: { username: string }) {
    return this.users.blockUser(user.id, body.username);
  }

  @Post('unblock')
  @ApiBearerAuth()
  unblockUser(@CurrentUser() user: AuthUser, @Body() body: { username: string }) {
    return this.users.unblockUser(user.id, body.username);
  }

  // ── Account Deletion ──

  @Delete('me/account')
  @ApiBearerAuth()
  deleteAccount(@CurrentUser() user: AuthUser, @Body() body: { reason?: string }) {
    return this.users.deleteAccount(user.id, body.reason);
  }
}
