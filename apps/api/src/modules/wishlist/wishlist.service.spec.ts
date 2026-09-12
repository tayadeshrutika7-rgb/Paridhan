import { Test, TestingModule } from '@nestjs/testing';
import { WishlistService } from './wishlist.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { NotFoundException } from '@nestjs/common';

describe('WishlistService (Phase 5)', () => {
  let service: WishlistService;
  let mockWishlistItems: any[] = [];
  let mockProducts: any[] = [];

  beforeEach(async () => {
    mockWishlistItems = [];
    mockProducts = [
      {
        id: 'prod-1',
        name: 'Rajasthani Printed Kurti',
        status: 'ACTIVE',
        shops: { name: 'Pink City Handlooms', city: 'Jaipur', status: 'VERIFIED' },
        product_variants: [
          { id: 'v1', size: 'M', color: 'Blue', price: 999, stock_quantity: 5, is_active: true },
        ],
      },
      {
        id: 'prod-2',
        name: 'Embroidered Dupatta',
        status: 'ARCHIVED',
        shops: { name: 'Heritage Silks', city: 'Jaipur', status: 'VERIFIED' },
        product_variants: [
          { id: 'v2', size: 'Free', color: 'Gold', price: 499, stock_quantity: 0, is_active: false },
        ],
      },
    ];

    const mockSupabase = {
      admin: {
        from: jest.fn((table: string) => {
          if (table === 'wishlists') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { id: 'wishlist-1', user_id: 'user-1' } }),
                }),
              }),
              insert: (data: any) => ({
                select: () => ({
                  single: async () => ({ data: { id: 'wishlist-1', ...data }, error: null }),
                }),
              }),
            };
          }

          if (table === 'products') {
            return {
              select: () => ({
                eq: (col: string, val: string) => ({
                  maybeSingle: async () => {
                    const prod = mockProducts.find((p) => p.id === val);
                    return { data: prod || null, error: null };
                  },
                }),
              }),
            };
          }

          if (table === 'wishlist_items') {
            return {
              select: () => ({
                eq: (col: string, val: string) => {
                  return {
                    eq: (col2: string, val2: string) => ({
                      maybeSingle: async () => {
                        const item = mockWishlistItems.find(
                          (i) => i.wishlist_id === val && i.product_id === val2,
                        );
                        return { data: item || null, error: null };
                      },
                    }),
                    data: mockWishlistItems.map((item) => {
                      const prod = mockProducts.find((p) => p.id === item.product_id);
                      return { ...item, products: prod };
                    }),
                    error: null,
                  };
                },
              }),
              insert: (data: any) => {
                const newItem = { id: `w-item-${Date.now()}`, ...data, created_at: new Date().toISOString() };
                mockWishlistItems.push(newItem);
                return {
                  select: () => ({
                    single: async () => ({ data: newItem, error: null }),
                  }),
                };
              },
              delete: () => ({
                eq: (col: string, val: string) => ({
                  eq: (col2: string, val2: string) => {
                    mockWishlistItems = mockWishlistItems.filter(
                      (i) => !(i.wishlist_id === val && i.product_id === val2),
                    );
                    return { data: null, error: null };
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
        WishlistService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();

    service = module.get<WishlistService>(WishlistService);
  });

  it('should add a valid product to user wishlist', async () => {
    const res = await service.addItem('user-1', 'prod-1');
    expect(res.success).toBe(true);
    expect(res.item).toBeDefined();
    expect(mockWishlistItems.length).toBe(1);
  });

  it('should throw NotFoundException when adding a non-existent product', async () => {
    await expect(service.addItem('user-1', 'non-existent-id')).rejects.toThrow(NotFoundException);
  });

  it('should toggle item in wishlist (add on first call, remove on second)', async () => {
    const addRes = await service.toggleItem('user-1', 'prod-1');
    expect(addRes.added).toBe(true);

    const removeRes = await service.toggleItem('user-1', 'prod-1');
    expect(removeRes.added).toBe(false);
  });

  it('should accurately report product availability status in wishlist', async () => {
    mockWishlistItems = [
      { id: 'item-1', wishlist_id: 'wishlist-1', product_id: 'prod-1', created_at: '2026-09-12' },
      { id: 'item-2', wishlist_id: 'wishlist-1', product_id: 'prod-2', created_at: '2026-09-12' },
    ];

    const items = await service.getWishlistItems('user-1');
    expect(items.length).toBe(2);

    const activeItem = items.find((i) => i.productId === 'prod-1');
    const inactiveItem = items.find((i) => i.productId === 'prod-2');

    expect(activeItem?.isAvailable).toBe(true);
    expect(activeItem?.inStockVariantsCount).toBe(1);

    expect(inactiveItem?.isAvailable).toBe(false);
    expect(inactiveItem?.inStockVariantsCount).toBe(0);
  });

  it('should remove an item from wishlist', async () => {
    mockWishlistItems = [
      { id: 'item-1', wishlist_id: 'wishlist-1', product_id: 'prod-1', created_at: '2026-09-12' },
    ];
    const res = await service.removeItem('user-1', 'prod-1');
    expect(res.success).toBe(true);
    expect(mockWishlistItems.length).toBe(0);
  });
});
