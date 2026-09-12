import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { SupabaseService } from '../../supabase/supabase.service';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@paridhan/types';
import { RazorpayVerifyDto } from '@paridhan/validation';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly razorpayKeyId: string;
  private readonly razorpayKeySecret: string;
  private readonly razorpayWebhookSecret: string;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.razorpayKeyId =
      this.configService.get<string>('RAZORPAY_KEY_ID') || 'rzp_test_paridhan_default_key';
    this.razorpayKeySecret =
      this.configService.get<string>('RAZORPAY_KEY_SECRET') || 'paridhan_test_secret_key_123';
    this.razorpayWebhookSecret =
      this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || 'paridhan_webhook_secret_123';
  }

  async createPaymentRecord(
    orderId: string,
    method: PaymentMethod,
    amount: number,
    razorpayOrderId?: string,
  ) {
    const { data, error } = await this.supabase.admin
      .from('payments')
      .insert({
        order_id: orderId,
        payment_method: method,
        razorpay_order_id: razorpayOrderId ?? null,
        amount,
        currency: 'INR',
        status: 'PENDING' as PaymentStatus,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createRazorpayOrder(orderId: string, amount: number) {
    const razorpayOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const payment = await this.createPaymentRecord(
      orderId,
      'ONLINE_RAZORPAY',
      amount,
      razorpayOrderId,
    );

    return {
      paymentId: payment.id,
      razorpayOrderId,
      amount,
      currency: 'INR',
      keyId: this.razorpayKeyId,
    };
  }

  /**
   * Server-Side Razorpay Payment Verification:
   * 1. Re-computes cryptographic HMAC SHA-256 signature using razorpayKeySecret.
   * 2. Re-fetches order & payment to verify amount integrity (anti-tampering).
   * 3. Idempotently updates order & payment state.
   */
  async verifyRazorpayPayment(userId: string, dto: RazorpayVerifyDto) {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = dto;

    // 1. Verify HMAC SHA-256 signature
    const generatedSignature = crypto
      .createHmac('sha256', this.razorpayKeySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      this.logger.warn(`Signature mismatch for order ${orderId}`);
      throw new BadRequestException('Invalid Razorpay payment signature. Payment verification failed.');
    }

    // 2. Fetch order and verify ownership & authoritative amount
    const { data: order, error: orderErr } = await this.supabase.admin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      throw new NotFoundException('Order not found');
    }

    if (order.user_id !== userId) {
      throw new ForbiddenException('You do not have permission to verify this order');
    }

    // 3. Find payment record
    const { data: payment, error: payErr } = await this.supabase.admin
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .eq('razorpay_order_id', razorpayOrderId)
      .maybeSingle();

    if (payErr || !payment) {
      throw new NotFoundException('Payment transaction record not found');
    }

    // Amount tampering check
    if (payment.amount !== order.total_amount) {
      throw new BadRequestException('Payment amount mismatch with order total');
    }

    // Idempotency: If already paid, return existing success
    if (payment.status === 'PAID') {
      return {
        success: true,
        orderId: order.id,
        paymentStatus: 'PAID',
        orderStatus: order.status,
        message: 'Payment was already verified and captured',
      };
    }

    // 4. Update payment record to PAID
    const { error: updatePayErr } = await this.supabase.admin
      .from('payments')
      .update({
        status: 'PAID' as PaymentStatus,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (updatePayErr) throw updatePayErr;

    // 5. Transition order to CONFIRMED
    const previousStatus = order.status;
    const newStatus: OrderStatus = 'CONFIRMED';

    const { data: updatedOrder, error: updateOrderErr } = await this.supabase.admin
      .from('orders')
      .update({
        status: newStatus,
        payment_status: 'PAID' as PaymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .select()
      .single();

    if (updateOrderErr) throw updateOrderErr;

    // 6. Record order status history
    await this.supabase.admin.from('order_status_history').insert({
      order_id: order.id,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by: userId,
      notes: `Online payment verified via Razorpay (Payment ID: ${razorpayPaymentId})`,
    });

    return {
      success: true,
      orderId: updatedOrder.id,
      paymentStatus: 'PAID',
      orderStatus: updatedOrder.status,
      orderNumber: updatedOrder.order_number,
    };
  }

  /**
   * Razorpay Webhook Handler:
   * - Verifies webhook signature against raw body.
   * - Provides Idempotent processing against duplicate webhook delivery.
   * - Updates payment and order status on capture or failure.
   */
  async handleRazorpayWebhook(signatureHeader: string, rawPayload: string | object) {
    const payloadString =
      typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', this.razorpayWebhookSecret)
      .update(payloadString)
      .digest('hex');

    if (expectedSignature !== signatureHeader) {
      this.logger.error('Invalid Razorpay Webhook Signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
    const eventType = event.event;
    const entity = event.payload?.payment?.entity || event.payload?.order?.entity;

    if (!entity) {
      return { status: 'ignored', reason: 'No payment or order entity in webhook payload' };
    }

    const razorpayOrderId = entity.order_id || entity.id;
    const razorpayPaymentId = entity.id;

    // Locate payment in database
    const { data: payment } = await this.supabase.admin
      .from('payments')
      .select('*')
      .or(`razorpay_order_id.eq.${razorpayOrderId},razorpay_payment_id.eq.${razorpayPaymentId}`)
      .maybeSingle();

    if (!payment) {
      this.logger.warn(`Webhook received for unknown Razorpay Order ID: ${razorpayOrderId}`);
      return { status: 'ignored', reason: 'Payment record not found' };
    }

    // Fetch associated order
    const { data: order } = await this.supabase.admin
      .from('orders')
      .select('*')
      .eq('id', payment.order_id)
      .maybeSingle();

    // Idempotency: Ignore duplicate capture events if already marked PAID
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      if (payment.status === 'PAID') {
        return { status: 'ignored', reason: 'Event already processed (idempotent)' };
      }

      // Check amount validation (Razorpay sends amount in paise)
      const eventAmountRupees = entity.amount ? entity.amount / 100 : payment.amount;
      if (Math.abs(eventAmountRupees - payment.amount) > 0.01) {
        this.logger.error(
          `Webhook amount mismatch: expected ${payment.amount}, received ${eventAmountRupees}`,
        );
        throw new BadRequestException('Amount mismatch in webhook payload');
      }

      // Update payment to PAID
      await this.supabase.admin
        .from('payments')
        .update({
          status: 'PAID' as PaymentStatus,
          razorpay_payment_id: razorpayPaymentId,
          raw_payload: event,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      // Update order to CONFIRMED
      if (order && order.status === 'PENDING_PAYMENT') {
        await this.supabase.admin
          .from('orders')
          .update({
            status: 'CONFIRMED' as OrderStatus,
            payment_status: 'PAID' as PaymentStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        await this.supabase.admin.from('order_status_history').insert({
          order_id: order.id,
          previous_status: 'PENDING_PAYMENT',
          new_status: 'CONFIRMED',
          notes: `Confirmed via Razorpay Webhook (${eventType})`,
        });
      }

      return { status: 'success', event: eventType, orderId: payment.order_id };
    }

    if (eventType === 'payment.failed') {
      if (payment.status === 'FAILED') {
        return { status: 'ignored', reason: 'Event already processed' };
      }

      await this.supabase.admin
        .from('payments')
        .update({
          status: 'FAILED' as PaymentStatus,
          raw_payload: event,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      if (order) {
        await this.supabase.admin
          .from('orders')
          .update({
            payment_status: 'FAILED' as PaymentStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);
      }

      return { status: 'handled', event: 'payment.failed', orderId: payment.order_id };
    }

    return { status: 'ignored', reason: `Unhandled event type: ${eventType}` };
  }
}
