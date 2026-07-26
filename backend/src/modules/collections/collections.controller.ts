import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CollectionsService } from './collections.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

class CreateCollectionDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
}

class UpdateCollectionDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
}

@ApiTags('Collections')
@ApiBearerAuth()
@Controller({ path: 'collections', version: '1' })
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCollectionDto) {
    return this.collections.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() q: PaginationDto) {
    return this.collections.findAll(user.id, q.page, q.limit);
  }

  @Public()
  @Get('user/:username')
  publicCollections(
    @Param('username') username: string,
    @Query() q: PaginationDto,
  ) {
    return this.collections.publicCollections(username, q.page, q.limit);
  }

  @Public()
  @Get('user/:username/:slug')
  findBySlug(
    @CurrentUser() user: AuthUser | undefined,
    @Param('username') username: string,
    @Param('slug') slug: string,
  ) {
    return this.collections.findBySlug(user?.id ?? '', username, slug);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.collections.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.collections.update(user.id, id, dto);
  }

  @Delete(':id')
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.collections.delete(user.id, id);
  }

  @Post(':id/items')
  addItem(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { productId: string },
  ) {
    return this.collections.addItem(user.id, id, body.productId);
  }

  @Delete(':id/items/:productId')
  removeItem(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('productId') productId: string,
  ) {
    return this.collections.removeItem(user.id, id, productId);
  }

  @Patch(':id/items/reorder')
  reorderItems(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { itemIds: string[] },
  ) {
    return this.collections.reorderItems(user.id, id, body.itemIds);
  }

  @Patch(':id/toggle-public')
  togglePublic(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.collections.togglePublic(user.id, id);
  }
}
