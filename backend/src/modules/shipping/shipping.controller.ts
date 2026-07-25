import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { ShippingService } from './shipping.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class CreateProfileDto {
  @IsString() name!: string;
  @IsOptional() @IsString() carrier?: string;
  @IsOptional() @IsString() estimatedDelivery?: string;
  @IsOptional() chargePaise?: number;
  @IsOptional() @IsBoolean() freeShipping?: boolean;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() rules?: Record<string, unknown>;
}

class UpdateProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() carrier?: string;
  @IsOptional() @IsString() estimatedDelivery?: string;
  @IsOptional() chargePaise?: number;
  @IsOptional() @IsBoolean() freeShipping?: boolean;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() rules?: Record<string, unknown>;
}

class UpdateTrackingDto {
  @IsString() trackingNumber!: string;
  @IsOptional() @IsString() carrier?: string;
  @IsOptional() @IsString() status?: string;
}

class SchedulePickupDto {
  @IsString() carrier!: string;
  @IsString() pickupDate!: string;
  @IsString() pickupTimeSlot!: string;
  @IsString() addressId!: string;
}

@ApiTags('Shipping')
@ApiBearerAuth()
@Controller({ path: 'sellers/shipping', version: '1' })
export class ShippingController {
  constructor(private readonly shipping: ShippingService) {}

  @Get('carriers')
  @ApiOperation({ summary: 'List supported carriers' })
  listCarriers() {
    return this.shipping.getAllCarriers();
  }

  @Post('profiles')
  @ApiOperation({ summary: 'Create shipping profile' })
  createProfile(@CurrentUser() user: AuthUser, @Body() dto: CreateProfileDto) {
    return this.shipping.createProfile(user.id, dto);
  }

  @Get('profiles')
  @ApiOperation({ summary: 'List shipping profiles' })
  listProfiles(@CurrentUser() user: AuthUser) {
    return this.shipping.listProfiles(user.id);
  }

  @Patch('profiles/:id')
  @ApiOperation({ summary: 'Update shipping profile' })
  updateProfile(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateProfileDto) {
    return this.shipping.updateProfile(user.id, id, dto as unknown as Record<string, unknown>);
  }

  @Delete('profiles/:id')
  @ApiOperation({ summary: 'Delete shipping profile' })
  deleteProfile(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.shipping.deleteProfile(user.id, id);
  }

  @Post('orders/:orderId/ship')
  @ApiOperation({ summary: 'Mark order as shipped with tracking' })
  shipOrder(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string, @Body() dto: UpdateTrackingDto) {
    return this.shipping.shipOrder(user.id, orderId, dto);
  }

  @Post('orders/:orderId/tracking')
  @ApiOperation({ summary: 'Update tracking info' })
  updateTracking(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string, @Body() dto: UpdateTrackingDto) {
    return this.shipping.updateTracking(user.id, orderId, dto);
  }

  @Post('orders/:orderId/pickup')
  @ApiOperation({ summary: 'Schedule a pickup with carrier' })
  schedulePickup(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string, @Body() dto: SchedulePickupDto) {
    return this.shipping.schedulePickup(user.id, orderId, dto);
  }

  @Post('orders/:orderId/label')
  @ApiOperation({ summary: 'Generate shipping label' })
  generateLabel(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string, @Body() body: { carrier?: string }) {
    return this.shipping.generateLabel(user.id, orderId, body.carrier);
  }

  @Get('orders/:orderId/track')
  @ApiOperation({ summary: 'Track shipment' })
  trackShipment(@Param('carrier') carrier: string, @Param('trackingNumber') trackingNumber: string) {
    return this.shipping.trackShipment(carrier, trackingNumber);
  }

  @Get('rates')
  @ApiOperation({ summary: 'Get shipping rates' })
  rateShipment(
    @CurrentUser() user: AuthUser,
    @Query('weightGrams') weightGrams: number,
    @Query('originPincode') originPincode: string,
    @Query('destPincode') destPincode: string,
    @Query('shippingMethod') shippingMethod?: string,
  ) {
    return this.shipping.rateShipment(user.id, weightGrams, originPincode, destPincode, shippingMethod);
  }

  @Get('delivery-estimate')
  @ApiOperation({ summary: 'Get delivery time estimate' })
  deliveryEstimate(
    @Query('originCity') originCity: string,
    @Query('originState') originState: string,
    @Query('originPincode') originPincode: string,
    @Query('destCity') destCity: string,
    @Query('destState') destState: string,
    @Query('destPincode') destPincode: string,
    @Query('shippingMethod') shippingMethod?: string,
  ) {
    return this.shipping.getDeliveryEstimate(originCity, originState, originPincode, destCity, destState, destPincode, shippingMethod);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get shipping settings' })
  getSettings(@CurrentUser() user: AuthUser) {
    return this.shipping.getSettings(user.id);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update shipping settings' })
  updateSettings(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.shipping.updateSettings(user.id, body);
  }
}
