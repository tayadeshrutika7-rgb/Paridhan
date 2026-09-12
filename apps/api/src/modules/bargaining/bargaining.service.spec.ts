import { Test, TestingModule } from '@nestjs/testing';
import { BargainingService } from './bargaining.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('BargainingService & Structured Human Negotiation (Phase 7)', () => {
  let service: BargainingService;

  let mockSessions: Record<string, any>;
  let mockOffers: any[];
  let mockProducts: Record<string, any>;
  let mockVariants: Record<string, any>;

  beforeEach(async () => {
    mockSessions = {};
    mockOffers = [];

    mockProducts = {
      'p-saree': {
        id: 'p-saree',
        shop_id: 'shop-jaipur-1',
        name: 'Handwoven Banarasi Saree',
        slug: 'handwoven-banarasi-saree',
        base_price: 1500,
        status: 'ACTIVE',
        is_bargaining_allowed: true,
        min_bargain_price: 1100, // Seller private floor price
        shops: {
          id: 'shop-jaipur-1',
          seller_id: 'seller-rajesh',
          name: 'Pink City Silks',
          status: 'VERIFIED',
        },
      },
      'p-fixed': {
        id: 'p-fixed',
        shop_id: 'shop-jaipur-1',
        name: 'Fixed Price Linen Shirt',
        slug: 'fixed-price-linen-shirt',
        base_price: 999,
        status: 'ACTIVE',
        is_bargaining_allowed: false, // Fixed price, bargaining disabled
        min_bargain_price: null,
        shops: {
          id: 'shop-jaipur-1',
          seller_id: 'seller-rajesh',
          name: 'Pink City Silks',
          status: 'VERIFIED',
        },
      },
    };

    mockVariants = {
      'v-saree-red': {
        id: 'v-saree-red',
        sku: 'SAR-BAN-RED',
        size: 'Free',
        color: 'Crimson Red',
        price: 1500,
        stock_quantity: 5,
        is_active: true,
        product_id: 'p-saree',
      },
      'v-fixed-m': {
        id: 'v-fixed-m',
        sku: 'SHT-FIX-M',
        size: 'M',
        color: 'White',
        price: 999,
        stock_quantity: 10,
        is_active: true,
        product_id: 'p-fixed',
      },
    };

    const mockSupabase = {
      admin: {
        from: jest.fn((table: string) => {
          if (table === 'products') {
            return {
              select: () => ({
                eq: (col: string, val: string) => ({
                  maybeSingle: async () => ({
                    data: mockProducts[val] || null,
                    error: null,
                  }),
                }),
              }),
            };
          }

          if (table === 'product_variants') {
            return {
              select: () => ({
                eq: (col: string, val: string) => ({
                  maybeSingle: async () => ({
                    data: mockVariants[val] || null,
                    error: null,
                  }),
                }),
              }),
            };
          }

          if (table === 'bargaining_sessions') {
            return {
              select: (query?: string) => ({
                eq: (col1: string, val1: string) => ({
                  eq: (col2: string, val2: string) => ({
                    eq: (col3: string, val3: string) => ({
                      data: Object.values(mockSessions).filter(
                        (s) =>
                          s[col1] === val1 && s[col2] === val2 && s[col3] === val3,
                      ),
                      error: null,
                    }),
                  }),
                  maybeSingle: async () => {
                    const session = mockSessions[val1];
                    if (!session) return { data: null, error: null };
                    const prod = mockProducts[session.product_id];
                    const v = mockVariants[session.variant_id];
                    const offers = mockOffers.filter((o) => o.session_id === session.id);
                    return {
                      data: {
                        ...session,
                        products: prod ? { ...prod } : null,
                        product_variants: v ? { ...v } : null,
                        shops: prod?.shops || null,
                        bargaining_offers: offers.map((o) => ({ ...o })),
                      },
                      error: null,
                    };
                  },
                }),
                in: (col: string, vals: string[]) => ({
                  order: () => ({
                    data: Object.values(mockSessions).filter((s) => vals.includes(s.shop_id)),
                    error: null,
                  }),
                }),
              }),
              insert: (data: any) => {
                const newSession = {
                  id: `sess-${Date.now()}`,
                  ...data,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                mockSessions[newSession.id] = newSession;
                return {
                  select: () => ({
                    single: async () => ({ data: newSession, error: null }),
                  }),
                };
              },
              update: (data: any) => ({
                eq: (col: string, val: string) => {
                  if (mockSessions[val]) {
                    mockSessions[val] = { ...mockSessions[val], ...data };
                  }
                  return {
                    select: () => ({
                      single: async () => ({ data: mockSessions[val], error: null }),
                    }),
                  };
                },
              }),
            };
          }

          if (table === 'bargaining_offers') {
            return {
              insert: (data: any) => {
                const newOffer = {
                  id: `off-${Date.now()}-${Math.random()}`,
                  ...data,
                  created_at: new Date().toISOString(),
                };
                mockOffers.push(newOffer);
                return {
                  select: () => ({
                    single: async () => ({ data: newOffer, error: null }),
                  }),
                };
              },
              update: (data: any) => ({
                eq: (col1: string, val1: string) => ({
                  eq: (col2: string, val2: string) => {
                    mockOffers.forEach((o) => {
                      if (o[col1] === val1 && o[col2] === val2) {
                        Object.assign(o, data);
                      }
                    });
                    return { error: null };
                  },
                }),
              }),
            };
          }

          if (table === 'shops') {
            return {
              select: () => ({
                eq: (col: string, val: string) => ({
                  data: Object.values(mockProducts)
                    .map((p) => p.shops)
                    .filter((s) => s.seller_id === val),
                  error: null,
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
        BargainingService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();

    service = module.get<BargainingService>(BargainingService);
  });

  describe('Session Initiation & Validation', () => {
    it('CRITICAL TEST: creates valid bargaining session with initial consumer offer', async () => {
      const session = await service.createSession('user-aarav', {
        productId: 'p-saree',
        variantId: 'v-saree-red',
        initialOffer: 1200,
        message: 'Looking to purchase today if price works!',
      });

      expect(session).toBeDefined();
      expect(session.status).toBe('OPEN');
      expect(session.original_price).toBe(1500);
      expect(session.bargaining_offers.length).toBe(1);
      expect(session.bargaining_offers[0].amount).toBe(1200);
      expect(session.bargaining_offers[0].sender_role).toBe('CONSUMER');
    });

    it('CRITICAL TEST: rejects bargaining on products where bargaining is disabled', async () => {
      await expect(
        service.createSession('user-aarav', {
          productId: 'p-fixed',
          variantId: 'v-fixed-m',
          initialOffer: 800,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('CRITICAL TEST: rejects offer amounts greater than or equal to listed price', async () => {
      await expect(
        service.createSession('user-aarav', {
          productId: 'p-saree',
          variantId: 'v-saree-red',
          initialOffer: 1500, // Same as listed price
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createSession('user-aarav', {
          productId: 'p-saree',
          variantId: 'v-saree-red',
          initialOffer: 1600, // Higher than listed price
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('CRITICAL TEST: rejects negative or zero offer amounts', async () => {
      await expect(
        service.createSession('user-aarav', {
          productId: 'p-saree',
          variantId: 'v-saree-red',
          initialOffer: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Structured Turn-Based Counter-Offer Progression', () => {
    let activeSessionId: string;

    beforeEach(async () => {
      const session = await service.createSession('user-aarav', {
        productId: 'p-saree',
        variantId: 'v-saree-red',
        initialOffer: 1200, // Buyer 1st offer
      });
      activeSessionId = session.id;
    });

    it('CRITICAL TEST: executes complete negotiation lifecycle (Buyer 1200 -> Seller 1400 -> Buyer 1300 -> Seller Accept 1300)', async () => {
      // 1. Seller counters 1400
      const sellerCounter = await service.submitCounterOffer(
        activeSessionId,
        'seller-rajesh',
        'SELLER',
        { amount: 1400, message: 'Best I can do is 1400 for authentic Banarasi silk' },
      );
      expect(sellerCounter.amount).toBe(1400);
      expect(sellerCounter.sender_role).toBe('SELLER');

      // 2. Buyer counters 1300
      const buyerCounter = await service.submitCounterOffer(
        activeSessionId,
        'user-aarav',
        'CONSUMER',
        { amount: 1300, message: 'Can we meet in the middle at 1300?' },
      );
      expect(buyerCounter.amount).toBe(1300);
      expect(buyerCounter.sender_role).toBe('CONSUMER');

      // 3. Seller accepts buyer counter of 1300
      const acceptResult = await service.acceptOffer(
        activeSessionId,
        'seller-rajesh',
        'SELLER',
      );
      expect(acceptResult.status).toBe('ACCEPTED');
      expect(acceptResult.agreedPrice).toBe(1300);

      // Verify session updated in storage
      const finalSession = await service.getSessionWithOffers(
        activeSessionId,
        'user-aarav',
        'CONSUMER',
      );
      expect(finalSession.status).toBe('ACCEPTED');
      expect(finalSession.agreed_price).toBe(1300);
    });

    it('CRITICAL TEST: blocks consecutive offers from the same sender without response', async () => {
      // Buyer already sent 1200, tries to immediately send 1250 without seller response
      await expect(
        service.submitCounterOffer(activeSessionId, 'user-aarav', 'CONSUMER', { amount: 1250 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('CRITICAL TEST: validates monotonic price bounds for buyer and seller', async () => {
      // 1. Seller counters 1400
      await service.submitCounterOffer(activeSessionId, 'seller-rajesh', 'SELLER', { amount: 1400 });

      // Buyer tries to counter with 1150 (lower than previous 1200) -> Rejected
      await expect(
        service.submitCounterOffer(activeSessionId, 'user-aarav', 'CONSUMER', { amount: 1150 }),
      ).rejects.toThrow(BadRequestException);

      // Buyer tries to counter with 1450 (higher than seller's 1400 counter) -> Rejected
      await expect(
        service.submitCounterOffer(activeSessionId, 'user-aarav', 'CONSUMER', { amount: 1450 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('CRITICAL TEST: prevents party from accepting their own offer', async () => {
      // Buyer tries to accept their own 1200 initial offer
      await expect(
        service.acceptOffer(activeSessionId, 'user-aarav', 'CONSUMER'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Rejection, Cancellation & Expiration', () => {
    let activeSessionId: string;

    beforeEach(async () => {
      const session = await service.createSession('user-aarav', {
        productId: 'p-saree',
        variantId: 'v-saree-red',
        initialOffer: 1200,
      });
      activeSessionId = session.id;
    });

    it('CRITICAL TEST: allows seller to reject negotiation', async () => {
      const res = await service.rejectOffer(activeSessionId, 'seller-rajesh', 'SELLER', {
        reason: 'Price too low for this item',
      });
      expect(res.status).toBe('REJECTED');

      // Subsequent counter is rejected
      await expect(
        service.submitCounterOffer(activeSessionId, 'seller-rajesh', 'SELLER', { amount: 1400 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('CRITICAL TEST: allows consumer to cancel negotiation session', async () => {
      const res = await service.cancelSession(activeSessionId, 'user-aarav');
      expect(res.status).toBe('CANCELLED');
    });

    it('CRITICAL TEST: automatically transitions past-expiry sessions to EXPIRED and blocks offers', async () => {
      // Artificially expire the session
      mockSessions[activeSessionId].expires_at = new Date(Date.now() - 3600000).toISOString();

      const session = await service.getSessionWithOffers(activeSessionId, 'user-aarav', 'CONSUMER');
      expect(session.status).toBe('EXPIRED');

      // Counter-offer blocked
      await expect(
        service.submitCounterOffer(activeSessionId, 'seller-rajesh', 'SELLER', { amount: 1400 }),
      ).rejects.toThrow(BadRequestException);

      // Acceptance blocked
      await expect(
        service.acceptOffer(activeSessionId, 'seller-rajesh', 'SELLER'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Security, Ownership & Floor Price Privacy', () => {
    let activeSessionId: string;

    beforeEach(async () => {
      const session = await service.createSession('user-aarav', {
        productId: 'p-saree',
        variantId: 'v-saree-red',
        initialOffer: 1200,
      });
      activeSessionId = session.id;
    });

    it('CRITICAL TEST: rejects unauthorized seller from other shops accessing or countering', async () => {
      await expect(
        service.submitCounterOffer(activeSessionId, 'seller-unauthorized', 'SELLER', {
          amount: 1400,
        }),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.acceptOffer(activeSessionId, 'seller-unauthorized', 'SELLER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('CRITICAL TEST: rejects unauthorized consumer from accessing another consumer session', async () => {
      await expect(
        service.getSessionWithOffers(activeSessionId, 'user-unauthorized', 'CONSUMER'),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.submitCounterOffer(activeSessionId, 'user-unauthorized', 'CONSUMER', {
          amount: 1300,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('CRITICAL TEST: strictly protects seller floor price (min_bargain_price never exposed to consumer)', async () => {
      // 1. When consumer fetches session
      const consumerView = await service.getSessionWithOffers(
        activeSessionId,
        'user-aarav',
        'CONSUMER',
      );
      expect(consumerView.products.min_bargain_price).toBeUndefined();

      // 2. When seller fetches session
      const sellerView = await service.getSessionWithOffers(
        activeSessionId,
        'seller-rajesh',
        'SELLER',
      );
      expect(sellerView.products.min_bargain_price).toBe(1100);
    });
  });
});
