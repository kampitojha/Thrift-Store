import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { MessagingService } from './messaging.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class StartConversationDto {
  @IsString() otherUserId!: string;
  @IsOptional() @IsString() productId?: string;
}

class SendMessageDto {
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() mediaUrl?: string;
  @IsOptional() @IsString() offerId?: string;
}

@ApiTags('Messaging')
@ApiBearerAuth()
@Controller({ path: 'messages', version: '1' })
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.messaging.listConversations(user.id);
  }

  @Get('search')
  searchConversations(
    @CurrentUser() user: AuthUser,
    @Query('q') query: string,
  ) {
    return this.messaging.searchConversations(user.id, query);
  }

  @Get('unread')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.messaging.getUnreadCount(user.id);
  }

  @Post()
  start(@CurrentUser() user: AuthUser, @Body() dto: StartConversationDto) {
    return this.messaging.startConversation(user.id, dto.otherUserId, dto.productId);
  }

  @Get(':conversationId')
  messages(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.messaging.getMessages(user.id, conversationId, cursor);
  }

  @Get(':conversationId/search')
  searchMessages(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
    @Query('q') query: string,
  ) {
    return this.messaging.searchMessages(user.id, conversationId, query);
  }

  @Post(':conversationId')
  send(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messaging.send(user.id, conversationId, dto.body, dto.mediaUrl, dto.offerId);
  }

  @Patch(':conversationId/mute')
  toggleMute(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messaging.toggleMute(user.id, conversationId);
  }

  @Patch(':conversationId/pin')
  togglePin(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messaging.togglePin(user.id, conversationId);
  }

  @Patch(':conversationId/archive')
  archive(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messaging.archiveConversation(user.id, conversationId);
  }

  @Delete(':conversationId')
  delete(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messaging.deleteConversation(user.id, conversationId);
  }

  @Get(':conversationId/online/:userId')
  onlineStatus(
    @Param('userId') userId: string,
  ) {
    return this.messaging.getOnlineStatus(userId);
  }
}
