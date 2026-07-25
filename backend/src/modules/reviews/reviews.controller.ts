import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ReviewsService } from './reviews.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

class CreateReviewDto {
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() targetUserId?: string;
  @IsOptional() @IsString() orderId?: string;
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsArray() mediaUrls?: string[];
}

@ApiTags('Reviews')
@Controller({ path: 'reviews', version: '1' })
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  @ApiBearerAuth()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReviewDto) {
    return this.reviews.create(user.id, dto);
  }

  @Public()
  @Get('product/:productId')
  forProduct(@Param('productId') productId: string, @Query() q: PaginationDto) {
    return this.reviews.forProduct(productId, q.page, q.limit);
  }

  @Post(':id/helpful')
  @ApiBearerAuth()
  helpful(@Param('id') id: string) {
    return this.reviews.markHelpful(id);
  }
}
