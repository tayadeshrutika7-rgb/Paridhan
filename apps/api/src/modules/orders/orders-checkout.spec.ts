import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PaymentsService } from '../payments/payments.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { BadRequestException } from '@nestjs/common';

describe('OrdersService & Authoritative Checkout Pipeline (Phase 6)', () => {
  let service: OrdersService;
  let paymentsService: PaymentsService;

  let mockCartItems: any[];
  let mockVariants: Record<string, any>;
  let mockProducts: Record<string, any>;
  let mockAddresses: Record<string, any>;
  let mockBargainingSessions: Record<string, any>;
  let mockInventoryMovements: any[];
  let mockOrders: any[];
  let mockOrderItems: any[];

  beforeEach(async () => {
    mockInventoryMovements = [];
    mockOrders = [];
    mockOrderItems = [];

    mockAddresses = {
      'addr-1': {
        id: 'addr-1',
        user_id: 'user-consumer',
        recipient_name: 'Aarav Sharma',
        city: 'Jaipur',
      },
    };

    mockProducts = {
      'p-shirt': {
        id: 'p-shirt',
        shop_id: 'shop-jaipur-1',
        name: 'Handblock Cotton Shirt',
        status: 'ACTIVE',
        shops: { id: 'shop-jaipur-1', name: 'Pink City Handlooms', status: 'VERIFIED' },
      },
      'p-saree': {
        id: 'p-saree',
        shop_id: 'shop-jaipur-1',
        name: 'Chanderi Silk Saree',
        status: 'ACTIVE',
        shops: { id: 'shop-jaipur-1', name: 'Pink City Handlooms', status: 'VERIFIED' },
      },
    };

    mockVariants = {
      'v-shirt-l': {
        id: 'v-shirt-l',
        sku: 'HBL-SHT-L',
        size: 'L',
        color: 'Indigo',
        price: 1499,
        stock_quantity: 8,
        is_active: true,
        product_id: 'p-shirt',
        products: mockProducts['p-shirt'],
      },
      'v-saree-free': {
        id: 'v-saree-free',
        sku: 'CHD-SAR-GOLD',
        size: 'Free',
        color: 'Maroon Gold',
        price: 3999,
        stock_quantity: 2,
        is_active: true,
        product_id: 'p-saree',
        products: mockProducts['p-saree'],
      },
    };

    mockBargainingSessions = {
      'bargain-saree': {
        id: 'bargain-saree',
        agreed_price: 3499, // discounted from 3999
        status: 'ACCEPTED',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
    };

    mockCartItems = [
      {
        id: 'ci-1',
        cart_id: 'cart-1',
        variant_id: 'v-shirt-l',
        quantity: 2, // 2 * 1499 = 2998
        bargaining_session_id: null,
      },
    ];

    const mockSupabase = {
      admin: {
        from: jest.fn((table: string) => {
          if (table === 'user_addresses') {
            return {
              select: () => ({
                eq: (col: string, val: string) => ({
                  eq: (col2: string, val2: string) => ({
                    maybeSingle: async () => ({
                      data:
                        mockAddresses[val] && mockAddresses[val].user_id === val2
                          ? mockAddresses[val]
                          : null,
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }

          if (table === 'carts') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { id: 'cart-1', user_id: 'user-consumer' }, error: null }),
                }),
              }),
            };
          }

          if (table === 'cart_items') {
            return {
              select: () => ({
                eq: () => ({
                  data: mockCartItems.map((i) => {
                    const v = mockVariants[i.variant_id];
                    const b = i.bargaining_session_id
                      ? mockBargainingSessions[i.bargaining_session_id]
                      : null;
                    return {
                      ...i,
                      product_variants: v ? { ...v, products: mockProducts[v.product_id] } : null,
                      bargaining_sessions: b,
                    };
                  }),
                  error: null,
                }),
              }),
              delete: () => ({
                in: (col: string, ids: string[]) => {
                  mockCartItems = mockCartItems.filter((i) => !ids.includes(i.id));
                  return { data: null, error: null };
                },
              }),
            };
          }

          if (table === 'product_variants') {
            return {
              select: () => ({
                eq: (col: string, val: string) => ({
                  single: async () => ({
                    data: mockVariants[val] ? { stock_quantity: mockVariants[val].stock_quantity } : null,
                    error: null,
                  }),
                }),
              }),
              update: (data: any) => ({
                eq: (col: string, val: string) => {
                  if (mockVariants[val]) {
                    mockVariants[val].stock_quantity = data.stock_quantity;
                  }
                  return { data: null, error: null };
                },
              }),
            };
          }

          if (table === 'inventory_movements') {
            return {
              insert: async (data: any) => {
                mockInventoryMovements.push(data);
                return { data: null, error: null };
              },
            };
          }

          if (table === 'orders') {
            return {
              insert: (data: any) => {
                const newOrder = { id: `order-${Date.now()}`, ...data, created_at: new Date().toISOString() };
                mockOrders.push(newOrder);
                return {
                  select: () => ({
                    single: async () => ({ data: newOrder, error: null }),
                  }),
                };
              },
            };
          }

          if (table === 'order_items') {
            return {
              insert: async (items: any[]) => {
                mockOrderItems.push(...items);
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
      createRazorpayOrder: jest.fn(async (orderId: string, amount: number) => ({
        paymentId: 'pay-rzp-1',
        razorpayOrderId: 'order_rzp_12345',
        amount,
        currency: 'INR',
        keyId: 'rzp_test_key',
      })),
      createPaymentRecord: jest.fn(async () => ({ id: 'pay-cod-1', status: 'PENDING' })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: PaymentsService, useValue: mockPaymentsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
  });

  it('CRITICAL TEST: checks out successfully with authoritative pricing & atomic stock reservation', async () => {
    const initialStock = mockVariants['v-shirt-l'].stock_quantity; // 8

    const result = await service.createCheckoutOrder('user-consumer', {
      addressId: 'addr-1',
      paymentMethod: 'ONLINE_RAZORPAY',
    });

    expect(result.order).toBeDefined();
    expect(result.order.status).toBe('PENDING_PAYMENT');
    expect(result.order.subtotal_amount).toBe(2998); // 2 * 1499
    expect(result.order.delivery_fee).toBe(0); // free delivery >= 999
    expect(result.order.total_amount).toBe(2998);
    expect(result.requiresPayment).toBe(true);
    expect(result.razorpayOrder.razorpayOrderId).toBe('order_rzp_12345');

    // Verify atomic stock decrement: 8 - 2 = 6
    expect(mockVariants['v-shirt-l'].stock_quantity).toBe(initialStock - 2);

    // Verify inventory movement audit logged
    expect(mockInventoryMovements.length).toBe(1);
    expect(mockInventoryMovements[0].reason).toBe('SALE');
    expect(mockInventoryMovements[0].quantity_change).toBe(-2);

    // Verify cart cleared
    expect(mockCartItems.length).toBe(0);
  });

  it('CRITICAL TEST: applies accepted bargaining agreed price during checkout', async () => {
    mockCartItems = [
      {
        id: 'ci-2',
        cart_id: 'cart-1',
        variant_id: 'v-saree-free',
        quantity: 1,
        bargaining_session_id: 'bargain-saree', // 3499 instead of 3999
      },
    ];

    const result = await service.createCheckoutOrder('user-consumer', {
      addressId: 'addr-1',
      paymentMethod: 'CASH_ON_DELIVERY',
    });

    expect(result.order.status).toBe('CONFIRMED');
    expect(result.order.subtotal_amount).toBe(3499);
    expect(result.order.total_amount).toBe(3499);
    expect(result.requiresPayment).toBe(false);
    expect(mockVariants['v-saree-free'].stock_quantity).toBe(1); // 2 - 1 = 1
  });

  it('CRITICAL TEST: rejects checkout if product was disabled/archived by seller', async () => {
    mockProducts['p-shirt'].status = 'ARCHIVED';

    await expect(
      service.createCheckoutOrder('user-consumer', {
        addressId: 'addr-1',
        paymentMethod: 'ONLINE_RAZORPAY',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('CRITICAL TEST: rejects checkout if variant became inactive', async () => {
    mockVariants['v-shirt-l'].is_active = false;

    await expect(
      service.createCheckoutOrder('user-consumer', {
        addressId: 'addr-1',
        paymentMethod: 'ONLINE_RAZORPAY',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('CRITICAL TEST: rejects checkout if quantity exceeds inventory (preventing overselling)', async () => {
    // Only 8 in stock, user had 10
    mockCartItems[0].quantity = 10;

    await expect(
      service.createCheckoutOrder('user-consumer', {
        addressId: 'addr-1',
        paymentMethod: 'ONLINE_RAZORPAY',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects checkout with invalid delivery address', async () => {
    await expect(
      service.createCheckoutOrder('user-consumer', {
        addressId: 'addr-wrong',
        paymentMethod: 'ONLINE_RAZORPAY',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
