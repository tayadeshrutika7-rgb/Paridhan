import {
  Controller,
  Post,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { SupabaseAuthGuard } from '../../supabase/guards/supabase-auth.guard';
import { CurrentUser } from '../../supabase/decorators/current-user.decorator';
import { UserProfile } from '@paridhan/types';
import { RazorpayVerifyDto } from '@paridhan/validation';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('verify')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Verify Razorpay payment signature and confirm order' })
  async verifyPayment(
    @CurrentUser() user: UserProfile,
    @Body() body: RazorpayVerifyDto,
  ) {
    return this.paymentsService.verifyRazorpayPayment(user.id, body);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Razorpay webhooks (Idempotent signature verified)' })
  async handleWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() body: any,
  ) {
    return this.paymentsService.handleRazorpayWebhook(signature, body);
  }
}
