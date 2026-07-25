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
}
