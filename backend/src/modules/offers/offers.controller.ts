import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { OffersService } from './offers.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class CreateOfferDto {
  @IsString() productId!: string;
  @IsInt() @Min(100) amountPaise!: number;
  @IsOptional() @IsString() message?: string;
}

class RespondOfferDto {
  @IsEnum(['accept', 'reject', 'counter']) action!: 'accept' | 'reject' | 'counter';
  @IsOptional() @IsInt() @Min(100) counterAmountPaise?: number;
}

@ApiTags('Offers')
@ApiBearerAuth()
@Controller({ path: 'offers', version: '1' })
export class OffersController {
  constructor(private readonly offers: OffersService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOfferDto) {
    return this.offers.create(user.id, dto.productId, dto.amountPaise, dto.message);
  }

  @Post(':id/respond')
  respond(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RespondOfferDto,
  ) {
    return this.offers.respond(user.id, id, dto.action, dto.counterAmountPaise);
  }

  @Get()
  mine(
    @CurrentUser() user: AuthUser,
    @Query('role') role: 'buyer' | 'seller' = 'buyer',
  ) {
    return this.offers.mine(user.id, role);
  }
}
