import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller({ path: 'auth/sessions', version: '1' })
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get()
  @ApiOperation({ summary: 'List active sessions' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.sessions.findAll(user.id);
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Revoke a specific session' })
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sessions.revoke(user.id, id);
  }

  @Post('revoke-others')
  @ApiOperation({ summary: 'Revoke all other sessions' })
  revokeOthers(@CurrentUser() user: AuthUser) {
    return this.sessions.revokeOthers(user.id);
  }
}
