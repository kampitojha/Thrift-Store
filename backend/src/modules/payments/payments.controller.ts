import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentsService } from './payments.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

class CreatePaymentDto {
  @IsString()
  orderId!: string;

  @IsOptional()
  @IsEnum(['RAZORPAY', 'STRIPE', 'COD', 'WALLET'])
  provider?: 'RAZORPAY' | 'STRIPE' | 'COD' | 'WALLET';
}

class VerifyPaymentDto {
  @IsString()
  razorpayOrderId!: string;

  @IsString()
  razorpayPaymentId!: string;

  @IsString()
  razorpaySignature!: string;
}

@ApiTags('Payments')
@ApiBearerAuth()
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('intent')
  createIntent(@CurrentUser() user: AuthUser, @Body() dto: CreatePaymentDto) {
    return this.payments.createPaymentIntent(user.id, dto.orderId, dto.provider || 'RAZORPAY');
  }

  @Post(':orderId/verify')
  verify(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.payments.verifyPayment(
      user.id,
      orderId,
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );
  }

  @Public()
  @Post('webhooks/razorpay')
  razorpayWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.payments.handleRazorpayWebhook(body, signature || '');
  }

  @Post(':orderId/refund')
  @Roles('ADMIN', 'SUPER_ADMIN')
  refund(
    @Param('orderId') orderId: string,
    @Body() body: { amountPaise?: number; reason?: string },
  ) {
    return this.payments.refund(orderId, body.amountPaise, body.reason);
  }
}
