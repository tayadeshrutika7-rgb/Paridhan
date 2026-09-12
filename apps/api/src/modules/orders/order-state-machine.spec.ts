import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PaymentsService } from '../payments/payments.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('Order State Machine & Strict Transitions (Phase 6)', () => {
  let service: OrdersService;

  let mockOrder: any;
  let mockOrderItems: any[];
  let mockVariants: Record<string, any>;
  let mockInventoryMovements: any[];

  beforeEach(async () => {
    mockInventoryMovements = [];

    mockVariants = {
      'v-kurti': { id: 'v-kurti', stock_quantity: 5 },
    };

    mockOrderItems = [
      { id: 'oi-1', order_id: 'ord-100', variant_id: 'v-kurti', quantity: 2 },
    ];

    mockOrder = {
      id: 'ord-100',
      user_id: 'user-consumer',
      shop_id: 'shop-1',
      status: 'CONFIRMED',
      payment_status: 'PAID',
      shops: { id: 'shop-1', seller_id: 'seller-rajesh', name: 'Pink City Handlooms' },
      deliveries: [{ id: 'del-1', delivery_partner_id: 'dp-karan', status: 'ASSIGNED' }],
      order_items: mockOrderItems,
    };

    const mockSupabase = {
      admin: {
        from: jest.fn((table: string) => {
          if (table === 'orders') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { ...mockOrder }, error: null }),
                }),
              }),
              update: (data: any) => {
                mockOrder = { ...mockOrder, ...data };
                return {
                  eq: () => ({
                    select: () => ({
                      single: async () => ({ data: mockOrder, error: null }),
                    }),
                  }),
                };
              },
            };
          }

          if (table === 'product_variants') {
            return {
              select: () => ({
                eq: (col: string, val: string) => ({
                  single: async () => ({
                    data: mockVariants[val] || null,
                    error: null,
                  }),
                }),
              }),
              update: (data: any) => ({
                eq: (col: string, val: string) => {
                  if (mockVariants[val]) {
                    mockVariants[val].stock_quantity = data.stock_quantity;
                  }
                  return { error: null };
                },
              }),
            };
          }

          if (table === 'inventory_movements') {
            return {
              insert: async (data: any) => {
                mockInventoryMovements.push(data);
                return { error: null };
              },
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

    const mockPaymentsService = {
      createRazorpayOrder: jest.fn(),
      createPaymentRecord: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: PaymentsService, useValue: mockPaymentsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('Valid State Flow Transitions', () => {
    it('allows Seller to advance CONFIRMED -> PREPARING -> READY_FOR_PICKUP', async () => {
      // 1. Seller starts preparing
      const preparing = await service.updateOrderStatus(
        'ord-100',
        'PREPARING',
        'seller-rajesh',
        'SELLER',
      );
      expect(preparing.status).toBe('PREPARING');

      // 2. Seller marks ready for pickup
      const ready = await service.updateOrderStatus(
        'ord-100',
        'READY_FOR_PICKUP',
        'seller-rajesh',
        'SELLER',
      );
      expect(ready.status).toBe('READY_FOR_PICKUP');
    });

    it('allows Delivery Partner to advance READY_FOR_PICKUP -> PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED', async () => {
      mockOrder.status = 'READY_FOR_PICKUP';

      // 1. Picked up by partner
      const pickedUp = await service.updateOrderStatus(
        'ord-100',
        'PICKED_UP',
        'dp-karan',
        'DELIVERY_PARTNER',
      );
      expect(pickedUp.status).toBe('PICKED_UP');

      // 2. Out for delivery
      const out = await service.updateOrderStatus(
        'ord-100',
        'OUT_FOR_DELIVERY',
        'dp-karan',
        'DELIVERY_PARTNER',
      );
      expect(out.status).toBe('OUT_FOR_DELIVERY');

      // 3. Delivered
      const delivered = await service.updateOrderStatus(
        'ord-100',
        'DELIVERED',
        'dp-karan',
        'DELIVERY_PARTNER',
      );
      expect(delivered.status).toBe('DELIVERED');
    });
  });

  describe('Invalid Transitions & Role Authorization Rejections', () => {
    it('CRITICAL TEST: rejects invalid transition jumping from PENDING_PAYMENT to DELIVERED', async () => {
      mockOrder.status = 'PENDING_PAYMENT';

      await expect(
        service.updateOrderStatus('ord-100', 'DELIVERED', 'user-consumer', 'CONSUMER'),
      ).rejects.toThrow(BadRequestException);
    });

    it('CRITICAL TEST: rejects transitioning from terminal state DELIVERED to CANCELLED', async () => {
      mockOrder.status = 'DELIVERED';

      await expect(
        service.updateOrderStatus('ord-100', 'CANCELLED', 'admin-1', 'ADMIN'),
      ).rejects.toThrow(BadRequestException);
    });

    it('CRITICAL TEST: rejects consumer attempting to mark an order as DELIVERED', async () => {
      mockOrder.status = 'OUT_FOR_DELIVERY';

      await expect(
        service.updateOrderStatus('ord-100', 'DELIVERED', 'user-consumer', 'CONSUMER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('CRITICAL TEST: rejects consumer cancelling order once in PREPARING status', async () => {
      mockOrder.status = 'PREPARING';

      await expect(
        service.updateOrderStatus('ord-100', 'CANCELLED', 'user-consumer', 'CONSUMER'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Atomic Restocking on Cancellation', () => {
    it('CRITICAL TEST: automatically restocks inventory and logs audit movement when order is cancelled', async () => {
      mockOrder.status = 'CONFIRMED';
      const initialStock = mockVariants['v-kurti'].stock_quantity; // 5

      const cancelled = await service.updateOrderStatus(
        'ord-100',
        'CANCELLED',
        'user-consumer',
        'CONSUMER',
        'Consumer requested cancellation',
        'Changed mind',
      );

      expect(cancelled.status).toBe('CANCELLED');

      // Stock should be restored: 5 + 2 = 7
      expect(mockVariants['v-kurti'].stock_quantity).toBe(initialStock + 2);

      // Audit movement recorded
      expect(mockInventoryMovements.length).toBe(1);
      expect(mockInventoryMovements[0].reason).toBe('RETURN');
      expect(mockInventoryMovements[0].quantity_change).toBe(2);
    });
  });
});
