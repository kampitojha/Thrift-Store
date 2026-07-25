import { Body, Controller, Delete, Get, Param, Post, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { AddressesService } from './addresses.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class CreateAddressDto {
  @IsOptional() @IsString() label?: string;
  @IsString() fullName!: string;
  @IsString() phone!: string;
  @IsString() line1!: string;
  @IsOptional() @IsString() line2?: string;
  @IsString() city!: string;
  @IsString() state!: string;
  @IsString() postalCode!: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsBoolean() isBilling?: boolean;
}

class UpdateAddressDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() line1?: string;
  @IsOptional() @IsString() line2?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsBoolean() isBilling?: boolean;
}

@ApiTags('Addresses')
@ApiBearerAuth()
@Controller({ path: 'addresses', version: '1' })
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new address' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAddressDto) {
    return this.addresses.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all addresses' })
  list(@CurrentUser() user: AuthUser) {
    return this.addresses.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get address by id' })
  one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.addresses.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update address' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateAddressDto) {
    return this.addresses.update(user.id, id, dto as Record<string, unknown>);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete address' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.addresses.remove(user.id, id);
  }

  @Post(':id/default')
  @ApiOperation({ summary: 'Set address as default' })
  setDefault(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.addresses.setDefault(user.id, id);
  }
}
