import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { CouponsService } from './coupons.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

enum CouponTypeDto {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
  FREE_SHIPPING = 'FREE_SHIPPING',
}

class CreateCouponDto {
  @IsString() code!: string;
  @IsEnum(CouponTypeDto) type!: CouponTypeDto;
  @Type(() => Number) @IsInt() @Min(1) value!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minOrderPaise?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxDiscountPaise?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) usageLimit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) perUserLimit?: number;
  @IsOptional() @IsString() startsAt?: string;
  @IsOptional() @IsString() endsAt?: string;
}

class UpdateCouponDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsEnum(CouponTypeDto) type?: CouponTypeDto;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) value?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minOrderPaise?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxDiscountPaise?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) usageLimit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) perUserLimit?: number;
  @IsOptional() @IsString() startsAt?: string;
  @IsOptional() @IsString() endsAt?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@ApiTags('Coupons')
@ApiBearerAuth()
@Controller({ path: 'sellers/coupons', version: '1' })
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a coupon' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCouponDto) {
    return this.coupons.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List seller coupons' })
  findAll(@CurrentUser() user: AuthUser, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.coupons.findAll(user.id, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a coupon' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.coupons.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a coupon' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.coupons.update(user.id, id, dto as unknown as Record<string, unknown>);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a coupon' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.coupons.remove(user.id, id);
  }
}
