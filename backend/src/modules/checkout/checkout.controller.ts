import { Body, Controller, Post, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CheckoutService } from './checkout.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class InitCheckoutDto {
  @IsOptional() @IsString() couponCode?: string;
}

class EstimateShippingDto {
  @IsString() shippingAddressId!: string;
  @IsOptional() @IsString() shippingMethod?: string;
}

class ApplyCouponDto {
  @IsString() code!: string;
}

class PlaceOrderDto {
  @IsString() shippingAddressId!: string;
  @IsOptional() @IsString() billingAddressId?: string;
  @IsOptional() @IsString() shippingMethod?: string;
  @IsOptional() @IsString() couponCode?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() paymentProvider?: string;
}

class CheckoutResponseDto {
  initSession!: any;
  estimatedShipping!: any;
  preview!: { subtotalPaise: number; shippingPaise: number; taxPaise: number; discountPaise: number; platformFeePaise: number; totalPaise: number; couponApplied: boolean; validationErrors: string[] };
}

@ApiTags('Checkout')
@ApiBearerAuth()
@Controller({ path: 'checkout', version: '1' })
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Get('init')
  @ApiOperation({ summary: 'Initialize checkout session with cart validation' })
  async init(@CurrentUser() user: AuthUser) {
    const session = await this.checkout.initSession(user.id);
    return {
      session,
      preview: {
        subtotalPaise: session.subtotalPaise,
        shippingPaise: session.shippingPaise,
        taxPaise: session.taxPaise,
        discountPaise: session.discountPaise,
        platformFeePaise: session.platformFeePaise,
        totalPaise: session.totalPaise,
        couponApplied: !!session.couponCode,
        validationErrors: session.validationErrors,
      },
    };
  }

  @Post('estimate-shipping')
  @ApiOperation({ summary: 'Estimate shipping cost and delivery' })
  async estimateShipping(@CurrentUser() user: AuthUser, @Body() dto: EstimateShippingDto) {
    const session = await this.checkout.initSession(user.id);
    const shipping = await this.checkout.estimateShipping(user.id, dto.shippingAddressId, dto.shippingMethod);
    const updated = await this.checkout.computeTotals({ ...session, ...shipping });
    return {
      shipping,
      preview: {
        subtotalPaise: updated.subtotalPaise,
        shippingPaise: updated.shippingPaise,
        taxPaise: updated.taxPaise,
        discountPaise: updated.discountPaise,
        platformFeePaise: updated.platformFeePaise,
        totalPaise: updated.totalPaise,
        couponApplied: !!updated.couponCode,
        estimatedDelivery: updated.estimatedDelivery,
      },
    };
  }

  @Post('apply-coupon')
  @ApiOperation({ summary: 'Validate and apply coupon code' })
  async applyCoupon(@CurrentUser() user: AuthUser, @Body() dto: ApplyCouponDto) {
    const session = await this.checkout.initSession(user.id);
    const coupon = await this.checkout.applyCoupon(user.id, dto.code, session.subtotalPaise);
    const updated = await this.checkout.computeTotals({ ...session, ...coupon });
    return {
      coupon: { code: coupon.couponCode, discountPaise: coupon.discountPaise },
      preview: {
        subtotalPaise: updated.subtotalPaise,
        shippingPaise: updated.shippingPaise,
        taxPaise: updated.taxPaise,
        discountPaise: updated.discountPaise,
        platformFeePaise: updated.platformFeePaise,
        totalPaise: updated.totalPaise,
        couponApplied: true,
      },
    };
  }

  @Post('preview')
  @ApiOperation({ summary: 'Preview order with all costs before placing' })
  async preview(@CurrentUser() user: AuthUser, @Body() dto: PlaceOrderDto) {
    const session = await this.checkout.initSession(user.id);
    const shipping = dto.shippingAddressId
      ? await this.checkout.estimateShipping(user.id, dto.shippingAddressId, dto.shippingMethod)
      : {};

    let discount = { discountPaise: 0, couponCode: undefined as string | undefined };
    if (dto.couponCode) {
      discount = await this.checkout.applyCoupon(user.id, dto.couponCode, session.subtotalPaise);
    }

    const updated = await this.checkout.computeTotals({
      ...session,
      ...shipping,
      ...discount,
      couponCode: discount.couponCode,
      shippingAddressId: dto.shippingAddressId,
      billingAddressId: dto.billingAddressId,
      shippingMethod: dto.shippingMethod,
      notes: dto.notes,
    });

    return { preview: updated };
  }

  @Post('place')
  @ApiOperation({ summary: 'Place order from checkout' })
  async placeOrder(@CurrentUser() user: AuthUser, @Body() dto: PlaceOrderDto) {
    const session = await this.checkout.initSession(user.id);
    const shipping = dto.shippingAddressId
      ? await this.checkout.estimateShipping(user.id, dto.shippingAddressId, dto.shippingMethod)
      : {};

    let discount = { discountPaise: 0, couponCode: undefined as string | undefined };
    if (dto.couponCode) {
      discount = await this.checkout.applyCoupon(user.id, dto.couponCode, session.subtotalPaise);
    }

    const fullSession = await this.checkout.computeTotals({
      ...session,
      ...shipping,
      ...discount,
      couponCode: discount.couponCode,
      shippingAddressId: dto.shippingAddressId,
      billingAddressId: dto.billingAddressId,
      shippingMethod: dto.shippingMethod,
      notes: dto.notes,
    });

    const { orderId, orderNumber, totalPaise } = await this.checkout.placeOrder(user.id, fullSession);
    return { orderId, orderNumber, totalPaise };
  }
}
