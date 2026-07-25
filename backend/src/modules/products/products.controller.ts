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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, SearchProductsDto } from './dto/product.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

class ReportProductDto {
  @IsString() reason!: string;
  @IsOptional() @IsString() details?: string;
}

@ApiTags('Products')
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Search & filter products' })
  search(@Query() query: SearchProductsDto) {
    return this.products.search(query);
  }

  @Get('me/listings')
  @ApiBearerAuth()
  myListings(
    @CurrentUser() user: AuthUser,
    @Query() q: PaginationDto,
    @Query('status') status?: string,
  ) {
    return this.products.myListings(user.id, q.page, q.limit, status);
  }

  @Public()
  @Get(':id/related')
  related(@Param('id') id: string) {
    return this.products.related(id);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get product by slug' })
  findOne(
    @Param('slug') slug: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.products.findBySlug(slug, user?.id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create product listing' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.products.create(user.id, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.products.remove(user.id, id);
  }

  @Post(':id/duplicate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Duplicate a listing' })
  duplicate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.products.duplicate(user.id, id);
  }

  @Post(':id/publish')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish/unpublish a listing' })
  publish(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('publish') publish: boolean) {
    return this.products.setPublishStatus(user.id, id, publish);
  }

  @Post(':id/mark-sold')
  @ApiBearerAuth()
  markSold(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.products.markSold(user.id, id);
  }

  @Post(':id/restore')
  @ApiBearerAuth()
  restore(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.products.restore(user.id, id);
  }

  @Post(':id/report')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report a product' })
  report(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReportProductDto,
  ) {
    return this.products.report(user.id, id, dto.reason, dto.details);
  }
}
