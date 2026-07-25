import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Wishlist')
@ApiBearerAuth()
@Controller({ path: 'wishlist', version: '1' })
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: PaginationDto) {
    return this.wishlist.list(user.id, q.page, q.limit);
  }

  @Post(':productId/toggle')
  toggle(@CurrentUser() user: AuthUser, @Param('productId') productId: string) {
    return this.wishlist.toggle(user.id, productId);
  }
}
