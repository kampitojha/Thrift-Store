import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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

  @Post(':conversationId')
  send(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messaging.send(user.id, conversationId, dto.body, dto.mediaUrl, dto.offerId);
  }
}
