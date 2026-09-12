import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PaymentsService } from './payments.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('PaymentsService & Razorpay Security (Phase 6)', () => {
  let service: PaymentsService;
  const TEST_KEY_SECRET = 'paridhan_test_secret_key_123';
  const TEST_WEBHOOK_SECRET = 'paridhan_webhook_secret_123';

  let mockPayments: Record<string, any>;
  let mockOrders: Record<string, any>;

  beforeEach(async () => {
    mockOrders = {
      'order-1': {
        id: 'order-1',
        order_number: 'ORD-12345',
        user_id: 'user-consumer-1',
        total_amount: 2998,
        status: 'PENDING_PAYMENT',
        payment_status: 'PENDING',
      },
    };

    mockPayments = {
      'pay-1': {
        id: 'pay-1',
        order_id: 'order-1',
        payment_method: 'ONLINE_RAZORPAY',
        razorpay_order_id: 'order_rzp_abc123',
        amount: 2998,
        status: 'PENDING',
      },
    };

    const mockSupabase = {
      admin: {
        from: jest.fn((table: string) => {
          if (table === 'orders') {
            return {
              select: () => ({
                eq: (col: string, val: string) => ({
                  maybeSingle: async () => ({
                    data: mockOrders[val] || null,
                    error: null,
                  }),
                }),
              }),
              update: (data: any) => ({
                eq: (col: string, val: string) => {
                  if (mockOrders[val]) {
                    mockOrders[val] = { ...mockOrders[val], ...data };
                  }
                  return {
                    select: () => ({
                      single: async () => ({ data: mockOrders[val], error: null }),
                    }),
                  };
                },
              }),
            };
          }

          if (table === 'payments') {
            return {
              select: () => ({
                eq: (col: string, val: string) => ({
                  eq: (col2: string, val2: string) => ({
                    maybeSingle: async () => {
                      const pay = Object.values(mockPayments).find(
                        (p) => p.order_id === val && p.razorpay_order_id === val2,
                      );
                      return { data: pay || null, error: null };
                    },
                  }),
                }),
                or: (query: string) => ({
                  maybeSingle: async () => {
                    const pay = Object.values(mockPayments)[0];
                    return {
                      data: pay ? { ...pay, orders: mockOrders[pay.order_id] } : null,
                      error: null,
                    };
                  },
                }),
              }),
              insert: (data: any) => ({
                select: () => ({
                  single: async () => {
                    const newPay = { id: `pay-${Date.now()}`, ...data };
                    mockPayments[newPay.id] = newPay;
                    return { data: newPay, error: null };
                  },
                }),
              }),
              update: (data: any) => ({
                eq: (col: string, val: string) => {
                  if (mockPayments[val]) {
                    mockPayments[val] = { ...mockPayments[val], ...data };
                  }
                  return { error: null };
                },
              }),
            };
          }

          if (table === 'order_status_history') {
            return {
              insert: async () => ({ error: null }),
            };
          }

          return {};
        }),
      },
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'RAZORPAY_KEY_ID') return 'rzp_test_paridhan';
        if (key === 'RAZORPAY_KEY_SECRET') return TEST_KEY_SECRET;
        if (key === 'RAZORPAY_WEBHOOK_SECRET') return TEST_WEBHOOK_SECRET;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('Server-side Razorpay Verification & Anti-Tampering', () => {
    it('CRITICAL TEST: successfully verifies valid HMAC SHA-256 signature and captures payment', async () => {
      const razorpayOrderId = 'order_rzp_abc123';
      const razorpayPaymentId = 'pay_rzp_xyz789';

      const validSignature = crypto
        .createHmac('sha256', TEST_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      const result = await service.verifyRazorpayPayment('user-consumer-1', {
        orderId: 'order-1',
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: validSignature,
      });

      expect(result.success).toBe(true);
      expect(result.paymentStatus).toBe('PAID');
      expect(result.orderStatus).toBe('CONFIRMED');

      expect(mockPayments['pay-1'].status).toBe('PAID');
      expect(mockPayments['pay-1'].razorpay_payment_id).toBe(razorpayPaymentId);
      expect(mockOrders['order-1'].status).toBe('CONFIRMED');
      expect(mockOrders['order-1'].payment_status).toBe('PAID');
    });

    it('CRITICAL TEST: rejects forged or manipulated payment signature', async () => {
      const forgedSignature = 'forged_fake_signature_hex_1234567890';

      await expect(
        service.verifyRazorpayPayment('user-consumer-1', {
          orderId: 'order-1',
          razorpayOrderId: 'order_rzp_abc123',
          razorpayPaymentId: 'pay_rzp_xyz789',
          razorpaySignature: forgedSignature,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPayments['pay-1'].status).toBe('PENDING');
      expect(mockOrders['order-1'].status).toBe('PENDING_PAYMENT');
    });

    it('CRITICAL TEST: rejects unauthorized user trying to verify payment on another user order', async () => {
      const razorpayOrderId = 'order_rzp_abc123';
      const razorpayPaymentId = 'pay_rzp_xyz789';

      const validSignature = crypto
        .createHmac('sha256', TEST_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      await expect(
        service.verifyRazorpayPayment('different-user', {
          orderId: 'order-1',
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: validSignature,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('CRITICAL TEST: rejects payment verification on amount mismatch (price tampering)', async () => {
      mockPayments['pay-1'].amount = 100; // Tampered down from order 2998

      const razorpayOrderId = 'order_rzp_abc123';
      const razorpayPaymentId = 'pay_rzp_xyz789';

      const validSignature = crypto
        .createHmac('sha256', TEST_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      await expect(
        service.verifyRazorpayPayment('user-consumer-1', {
          orderId: 'order-1',
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: validSignature,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Razorpay Webhook Handling & Idempotency', () => {
    it('CRITICAL TEST: securely processes valid webhook payment.captured event', async () => {
      const webhookPayload = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_rzp_xyz789',
              order_id: 'order_rzp_abc123',
              amount: 299800, // in paise
              status: 'captured',
            },
          },
        },
      });

      const validWebhookSignature = crypto
        .createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update(webhookPayload)
        .digest('hex');

      const res = await service.handleRazorpayWebhook(validWebhookSignature, webhookPayload);

      expect(res.status).toBe('success');
      expect(mockPayments['pay-1'].status).toBe('PAID');
      expect(mockOrders['order-1'].status).toBe('CONFIRMED');
    });

    it('CRITICAL TEST: idempotent protection ignores duplicate webhook calls', async () => {
      mockPayments['pay-1'].status = 'PAID'; // Already processed

      const webhookPayload = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_rzp_xyz789',
              order_id: 'order_rzp_abc123',
              amount: 299800,
            },
          },
        },
      });

      const validWebhookSignature = crypto
        .createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update(webhookPayload)
        .digest('hex');

      const res = await service.handleRazorpayWebhook(validWebhookSignature, webhookPayload);

      expect(res.status).toBe('ignored');
      expect(res.reason).toContain('idempotent');
    });

    it('CRITICAL TEST: rejects invalid webhook signature', async () => {
      const webhookPayload = JSON.stringify({ event: 'payment.captured' });
      const invalidSignature = 'invalid_webhook_sig';

      await expect(
        service.handleRazorpayWebhook(invalidSignature, webhookPayload),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
