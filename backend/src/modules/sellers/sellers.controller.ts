import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { SellersService } from './sellers.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class CreateStoreDto {
  @IsString() storeName!: string;
  @IsOptional() @IsString() storeDescription?: string;
  @IsOptional() @IsString() businessType?: string;
}

class VerificationDto {
  @IsString() type!: string;
  @IsString() documentUrl!: string;
}

@ApiTags('Sellers')
@Controller({ path: 'sellers', version: '1' })
export class SellersController {
  constructor(private readonly sellers: SellersService) {}

  @Post('store')
  @ApiBearerAuth()
  createStore(@CurrentUser() user: AuthUser, @Body() dto: CreateStoreDto) {
    return this.sellers.createStore(user.id, dto);
  }

  @Public()
  @Get('store/:slug')
  getStore(@Param('slug') slug: string) {
    return this.sellers.getStore(slug);
  }

  @Get('dashboard')
  @ApiBearerAuth()
  dashboard(@CurrentUser() user: AuthUser) {
    return this.sellers.dashboard(user.id);
  }

  @Post('verification')
  @ApiBearerAuth()
  verify(@CurrentUser() user: AuthUser, @Body() dto: VerificationDto) {
    return this.sellers.submitVerification(user.id, dto.type, dto.documentUrl);
  }
}
