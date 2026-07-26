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
import { GiftCardsService } from './gift-cards.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Gift Cards')
@ApiBearerAuth()
@Controller({ path: 'gift-cards', version: '1' })
@UseGuards(RolesGuard)
export class GiftCardsController {
  constructor(private readonly giftCards: GiftCardsService) {}

  // Admin endpoints
  @Get('admin')
  @Roles('ADMIN', 'SUPER_ADMIN')
  list(
    @Query() q: PaginationDto,
    @Query('isActive') isActive?: string,
  ) {
    return this.giftCards.list(q.page, q.limit, {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('admin/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  get(@Param('id') id: string) {
    return this.giftCards.get(id);
  }

  @Post('admin')
  @Roles('ADMIN', 'SUPER_ADMIN')
  create(
    @Body() body: { amountPaise: number; ownerId?: string; expiresAt?: string },
  ) {
    return this.giftCards.create(body);
  }

  @Patch('admin/:id/deactivate')
  @Roles('ADMIN', 'SUPER_ADMIN')
  deactivate(@Param('id') id: string) {
    return this.giftCards.deactivate(id);
  }

  // Public validate
  @Get('validate/:code')
  @Public()
  validate(@Param('code') code: string) {
    return this.giftCards.validate(code);
  }

  // User endpoints
  @Get('my-cards')
  myCards(@CurrentUser() user: AuthUser) {
    return this.giftCards.myCards(user.id);
  }

  @Post('purchase')
  purchase(
    @CurrentUser() user: AuthUser,
    @Body('amountPaise') amountPaise: number,
  ) {
    return this.giftCards.purchase(user.id, amountPaise);
  }

  @Post('redeem')
  redeem(
    @CurrentUser() user: AuthUser,
    @Body('code') code: string,
    @Body('amountPaise') amountPaise: number,
  ) {
    return this.giftCards.redeem(code, user.id, amountPaise);
  }
}
