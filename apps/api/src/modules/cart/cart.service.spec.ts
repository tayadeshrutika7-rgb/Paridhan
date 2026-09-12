import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CartService & Non-Authoritative Basket Engine (Phase 5)', () => {
  let service: CartService;
  let mockCart: any;
  let mockCartItems: any[];
  let mockVariants: Record<string, any>;
  let mockProducts: Record<string, any>;
  let mockBargainingSessions: Record<string, any>;

  beforeEach(async () => {
    mockCart = { id: 'cart-123', user_id: 'user-abc' };

    mockProducts = {
      'p-shirt': {
        id: 'p-shirt',
        name: 'Classic Linen Shirt',
        slug: 'classic-linen-shirt',
        base_price: 1299,
        status: 'ACTIVE',
        shops: { id: 'shop-1', name: 'Royal Textiles', status: 'VERIFIED' },
        product_images: [{ image_url: 'https://example.com/shirt.jpg', is_primary: true }],
      },
      'p-kurti': {
        id: 'p-kurti',
        name: 'Cotton Embroidered Kurti',
        slug: 'cotton-embroidered-kurti',
        base_price: 799,
        status: 'ACTIVE',
        shops: { id: 'shop-1', name: 'Royal Textiles', status: 'VERIFIED' },
        product_images: [{ image_url: 'https://example.com/kurti.jpg', is_primary: true }],
      },
    };

    mockVariants = {
      'v-shirt-m': {
        id: 'v-shirt-m',
        sku: 'SHIRT-LIN-M',
        size: 'M',
        color: 'White',
        price: 1299,
        stock_quantity: 10,
        is_active: true,
        product_id: 'p-shirt',
        products: mockProducts['p-shirt'],
      },
      'v-kurti-s': {
        id: 'v-kurti-s',
        sku: 'KURTI-COT-S',
        size: 'S',
        color: 'Navy',
        price: 799,
        stock_quantity: 4,
        is_active: true,
        product_id: 'p-kurti',
        products: mockProducts['p-kurti'],
      },
    };

    mockBargainingSessions = {
      'bargain-accepted': {
        id: 'bargain-accepted',
        agreed_price: 1100,
        status: 'ACCEPTED',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
    };

    mockCartItems = [
      {
        id: 'ci-1',
        cart_id: 'cart-123',
        variant_id: 'v-shirt-m',
        quantity: 2,
        bargaining_session_id: null,
      },
    ];

    const mockSupabase = {
      admin: {
        from: jest.fn((table: string) => {
          if (table === 'carts') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: mockCart, error: null }),
                }),
              }),
              insert: (data: any) => ({
                select: () => ({
                  single: async () => ({ data: { id: 'cart-123', ...data }, error: null }),
                }),
              }),
            };
          }

          if (table === 'cart_items') {
            return {
              select: (cols?: string) => ({
                eq: (col1: string, val1: string) => {
                  const getSingleItem = (c1: string, v1: string, c2?: string, v2?: string) => {
                    let items = mockCartItems;
                    if (c1 === 'id') items = items.filter((i) => i.id === v1);
                    if (c1 === 'cart_id') items = items.filter((i) => i.cart_id === v1);
                    if (c1 === 'variant_id') items = items.filter((i) => i.variant_id === v1);
                    if (c2 === 'id') items = items.filter((i) => i.id === v2);
                    if (c2 === 'cart_id') items = items.filter((i) => i.cart_id === v2);
                    if (c2 === 'variant_id') items = items.filter((i) => i.variant_id === v2);

                    const item = items[0];
                    if (!item) return null;
                    const v = mockVariants[item.variant_id];
                    return { ...item, product_variants: v };
                  };

                  return {
                    eq: (col2: string, val2: string) => ({
                      maybeSingle: async () => ({
                        data: getSingleItem(col1, val1, col2, val2),
                        error: null,
                      }),
                      single: async () => ({
                        data: getSingleItem(col1, val1, col2, val2),
                        error: null,
                      }),
                    }),
                    maybeSingle: async () => ({
                      data: getSingleItem(col1, val1),
                      error: null,
                    }),
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
                  };
                },
              }),
              insert: (data: any) => {
                const newItem = { id: `ci-${Date.now()}`, ...data };
                mockCartItems.push(newItem);
                return {
                  select: () => ({
                    single: async () => ({ data: newItem, error: null }),
                  }),
                };
              },
              update: (data: any) => ({
                eq: (col: string, val: string) => {
                  const idx = mockCartItems.findIndex((i) => i.id === val);
                  if (idx >= 0) {
                    mockCartItems[idx] = { ...mockCartItems[idx], ...data };
                  }
                  return {
                    select: () => ({
                      single: async () => ({ data: mockCartItems[idx], error: null }),
                    }),
                  };
                },
              }),
              upsert: (data: any) => {
                const existingIdx = mockCartItems.findIndex(
                  (i) => i.cart_id === data.cart_id && i.variant_id === data.variant_id,
                );
                if (existingIdx >= 0) {
                  mockCartItems[existingIdx] = { ...mockCartItems[existingIdx], ...data };
                } else {
                  mockCartItems.push({ id: `ci-${Date.now()}`, ...data });
                }
                return {
                  select: () => ({
                    single: async () => ({ data: data, error: null }),
                  }),
                };
              },
              delete: () => ({
                eq: (col1: string, val1: string) => {
                  mockCartItems = mockCartItems.filter((i) => i[col1] !== val1);
                  return {
                    eq: (col2: string, val2: string) => {
                      mockCartItems = mockCartItems.filter((i) => !(i[col1] === val1 && i[col2] === val2));
                      return { error: null };
                    },
                    error: null,
                  };
                },
              }),
            };
          }

          if (table === 'product_variants') {
            return {
              select: () => ({
                eq: (col: string, val: string) => ({
                  single: async () => {
                    const v = mockVariants[val];
                    return { data: v || null, error: v ? null : new Error('Not found') };
                  },
                  maybeSingle: async () => {
                    const v = mockVariants[val];
                    return { data: v || null, error: null };
                  },
                }),
              }),
            };
          }

          return {};
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  describe('Authoritative Cart Summary & Re-fetching', () => {
    it('calculates subtotal and free delivery when subtotal exceeds 999', async () => {
      // 2 * 1299 = 2598
      const summary = await service.getCartSummary('user-abc');
      expect(summary.subtotalAmount).toBe(2598);
      expect(summary.deliveryFee).toBe(0); // Free delivery >= 999
      expect(summary.totalAmount).toBe(2598);
      expect(summary.items[0].isAvailable).toBe(true);
      expect(summary.hasUnavailableItems).toBe(false);
    });

    it('calculates delivery fee foundation (49 INR) when subtotal is under 999', async () => {
      mockCartItems = [
        {
          id: 'ci-2',
          cart_id: 'cart-123',
          variant_id: 'v-kurti-s',
          quantity: 1, // 1 * 799 = 799
          bargaining_session_id: null,
        },
      ];

      const summary = await service.getCartSummary('user-abc');
      expect(summary.subtotalAmount).toBe(799);
      expect(summary.deliveryFee).toBe(49);
      expect(summary.totalAmount).toBe(848);
    });

    it('CRITICAL TEST: reflects seller price change after cart item creation', async () => {
      // Seller raises price from 1299 to 1499
      mockVariants['v-shirt-m'].price = 1499;

      const summary = await service.getCartSummary('user-abc');
      expect(summary.items[0].unitPrice).toBe(1499);
      expect(summary.subtotalAmount).toBe(1499 * 2); // 2998
    });

    it('CRITICAL TEST: applies accepted bargaining agreed price if session exists', async () => {
      mockCartItems = [
        {
          id: 'ci-1',
          cart_id: 'cart-123',
          variant_id: 'v-shirt-m',
          quantity: 1,
          bargaining_session_id: 'bargain-accepted', // agreed 1100
        },
      ];

      const summary = await service.getCartSummary('user-abc');
      expect(summary.items[0].unitPrice).toBe(1100);
      expect(summary.items[0].isBargainedPrice).toBe(true);
      expect(summary.subtotalAmount).toBe(1100);
    });

    it('CRITICAL TEST: marks item unavailable when seller archives/disables product', async () => {
      mockProducts['p-shirt'].status = 'ARCHIVED';

      const summary = await service.getCartSummary('user-abc');
      expect(summary.items[0].isAvailable).toBe(false);
      expect(summary.items[0].unavailableReason).toContain('archived');
      expect(summary.subtotalAmount).toBe(0);
      expect(summary.hasUnavailableItems).toBe(true);
    });

    it('CRITICAL TEST: marks item unavailable when variant is disabled by seller', async () => {
      mockVariants['v-shirt-m'].is_active = false;

      const summary = await service.getCartSummary('user-abc');
      expect(summary.items[0].isAvailable).toBe(false);
      expect(summary.items[0].unavailableReason).toContain('inactive');
      expect(summary.subtotalAmount).toBe(0);
    });

    it('CRITICAL TEST: marks item unavailable when inventory becomes zero', async () => {
      mockVariants['v-shirt-m'].stock_quantity = 0;

      const summary = await service.getCartSummary('user-abc');
      expect(summary.items[0].isAvailable).toBe(false);
      expect(summary.items[0].unavailableReason).toContain('out of stock');
    });

    it('CRITICAL TEST: marks item unavailable when requested quantity exceeds inventory', async () => {
      mockVariants['v-shirt-m'].stock_quantity = 1; // cart has 2

      const summary = await service.getCartSummary('user-abc');
      expect(summary.items[0].isAvailable).toBe(false);
      expect(summary.items[0].stockWarning).toBe(true);
      expect(summary.items[0].unavailableReason).toContain('Only 1 available');
    });
  });

  describe('Cart Item Operations & Validation', () => {
    it('adds valid variant to cart', async () => {
      const res = await service.addItem('user-abc', 'v-kurti-s', 2);
      expect(res).toBeDefined();
      expect(mockCartItems.some((i) => i.variant_id === 'v-kurti-s')).toBe(true);
    });

    it('rejects adding variant when requested quantity exceeds available stock', async () => {
      // v-kurti-s only has 4 in stock
      await expect(service.addItem('user-abc', 'v-kurti-s', 10)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('updates quantity when valid', async () => {
      const updated: any = await service.updateQuantity('user-abc', 'ci-1', 4);
      expect(updated.quantity).toBe(4);
    });

    it('removes item when quantity updated to 0', async () => {
      const res: any = await service.updateQuantity('user-abc', 'ci-1', 0);
      expect(res.success).toBe(true);
      expect(mockCartItems.length).toBe(0);
    });

    it('rejects updating quantity above available inventory', async () => {
      // v-shirt-m has 10 in stock
      await expect(service.updateQuantity('user-abc', 'ci-1', 20)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('removes item and clears cart', async () => {
      await service.clearCart('user-abc');
      expect(mockCartItems.length).toBe(0);
    });
  });
});
