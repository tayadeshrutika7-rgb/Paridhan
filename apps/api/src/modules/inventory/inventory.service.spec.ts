import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('InventoryService (Phase 3)', () => {
  let service: InventoryService;

  const mockSupabaseService = {
    admin: {
      from: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('getShopInventory', () => {
    it('should calculate low-stock (<=5) and out-of-stock (<=0) indicator flags correctly', async () => {
      mockSupabaseService.admin.from.mockImplementation((table: string) => {
        if (table === 'shops') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'shop-1' },
                }),
              }),
            }),
          };
        }
        if (table === 'product_variants') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'v1',
                      product_id: 'p1',
                      sku: 'SKU-IN-STOCK',
                      size: 'M',
                      color: 'Blue',
                      price: 999,
                      stock_quantity: 20,
                      is_active: true,
                      products: { name: 'Blue Denim' },
                    },
                    {
                      id: 'v2',
                      product_id: 'p1',
                      sku: 'SKU-LOW-STOCK',
                      size: 'L',
                      color: 'Blue',
                      price: 999,
                      stock_quantity: 3,
                      is_active: true,
                      products: { name: 'Blue Denim' },
                    },
                    {
                      id: 'v3',
                      product_id: 'p1',
                      sku: 'SKU-OUT-OF-STOCK',
                      size: 'XL',
                      color: 'Blue',
                      price: 999,
                      stock_quantity: 0,
                      is_active: true,
                      products: { name: 'Blue Denim' },
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const inventory = await service.getShopInventory('seller-1');

      expect(inventory.length).toBe(3);

      // Normal in-stock
      expect(inventory[0].isLowStock).toBe(false);
      expect(inventory[0].isOutOfStock).toBe(false);

      // Low stock (3 <= 5)
      expect(inventory[1].isLowStock).toBe(true);
      expect(inventory[1].isOutOfStock).toBe(false);

      // Out of stock (0)
      expect(inventory[2].isLowStock).toBe(false);
      expect(inventory[2].isOutOfStock).toBe(true);
    });
  });

  describe('adjustStock & overselling prevention', () => {
    it('should adjust stock and log an inventory movement record', async () => {
      mockSupabaseService.admin.from.mockImplementation((table: string) => {
        if (table === 'product_variants') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'var-1',
                    sku: 'SHIRT-BLK-S',
                    stock_quantity: 10,
                    products: { shop_id: 'shop-1', shops: { seller_id: 'seller-1' } },
                  },
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'var-1', sku: 'SHIRT-BLK-S', stock_quantity: 15 },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'inventory_movements') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });

      const result = await service.adjustStock('seller-1', {
        variantId: 'var-1',
        quantityChange: 5,
        reason: 'RESTOCK',
      });

      expect(result.previousStock).toBe(10);
      expect(result.newStock).toBe(15);
      expect(result.change).toBe(5);
    });

    it('should prevent overselling and negative inventory deductions', async () => {
      mockSupabaseService.admin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'var-1',
                sku: 'SHIRT-BLK-S',
                stock_quantity: 3,
                products: { shop_id: 'shop-1', shops: { seller_id: 'seller-1' } },
              },
            }),
          }),
        }),
      });

      await expect(
        service.adjustStock('seller-1', {
          variantId: 'var-1',
          quantityChange: -10,
          reason: 'SALE',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user attempts to adjust inventory of another seller', async () => {
      mockSupabaseService.admin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'var-1',
                stock_quantity: 10,
                products: { shop_id: 'shop-1', shops: { seller_id: 'real-owner' } },
              },
            }),
          }),
        }),
      });

      await expect(
        service.adjustStock('intruder', {
          variantId: 'var-1',
          quantityChange: 5,
          reason: 'RESTOCK',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getVariantStock', () => {
    it('should retrieve accurate current stock quantity for variant', async () => {
      mockSupabaseService.admin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { stock_quantity: 42 },
              error: null,
            }),
          }),
        }),
      });

      const stock = await service.getVariantStock('var-42');
      expect(stock).toBe(42);
    });
  });
});
