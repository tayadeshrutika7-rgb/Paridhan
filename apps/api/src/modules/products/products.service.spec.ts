import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ProductsService (Phase 3)', () => {
  let service: ProductsService;

  const mockSupabaseService = {
    admin: {
      from: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('createProduct', () => {
    it('should create product with multi-size/color variants and log initial movements', async () => {
      mockSupabaseService.admin.from.mockImplementation((table: string) => {
        if (table === 'shops') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'shop-1', seller_id: 'seller-1' },
                }),
              }),
            }),
          };
        }
        if (table === 'products') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'prod-1',
                    shop_id: 'shop-1',
                    name: 'Classic Casual Shirt',
                    base_price: 999,
                    status: 'ACTIVE',
                  },
                  error: null,
                }),
              }),
            }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'prod-1',
                    name: 'Classic Casual Shirt',
                    product_variants: [
                      { id: 'var-1', sku: 'SHIRT-BLK-S', size: 'S', color: 'Black', stock_quantity: 10 },
                      { id: 'var-2', sku: 'SHIRT-BLK-M', size: 'M', color: 'Black', stock_quantity: 15 },
                    ],
                  },
                }),
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'prod-1',
                    name: 'Classic Casual Shirt',
                    product_variants: [
                      { id: 'var-1', sku: 'SHIRT-BLK-S', size: 'S', color: 'Black', stock_quantity: 10 },
                      { id: 'var-2', sku: 'SHIRT-BLK-M', size: 'M', color: 'Black', stock_quantity: 15 },
                    ],
                  },
                }),
              }),
            }),
          };
        }
        if (table === 'product_variants') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [
                  { id: 'var-1', sku: 'SHIRT-BLK-S', size: 'S', color: 'Black', stock_quantity: 10 },
                  { id: 'var-2', sku: 'SHIRT-BLK-M', size: 'M', color: 'Black', stock_quantity: 15 },
                ],
                error: null,
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

      const product = await service.createProduct('seller-1', {
        shopId: 'shop-1',
        categoryId: 'cat-1',
        name: 'Classic Casual Shirt',
        description: 'Premium woven casual shirt for everyday wear',
        basePrice: 999,
        variants: [
          { sku: 'SHIRT-BLK-S', size: 'S', color: 'Black', price: 999, stockQuantity: 10 },
          { sku: 'SHIRT-BLK-M', size: 'M', color: 'Black', price: 999, stockQuantity: 15 },
        ],
      });

      expect(product.id).toBe('prod-1');
      expect(product.name).toBe('Classic Casual Shirt');
      expect(product.product_variants.length).toBe(2);
    });

    it('should throw ForbiddenException if user tries to add product to a shop they do not own', async () => {
      mockSupabaseService.admin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'shop-other', seller_id: 'real-owner' },
            }),
          }),
        }),
      });

      await expect(
        service.createProduct('intruder-user', {
          shopId: 'shop-other',
          categoryId: 'cat-1',
          name: 'Hacked Shirt',
          description: 'Description of product',
          basePrice: 500,
          variants: [{ sku: 'SKU-1', size: 'M', color: 'Red', price: 500, stockQuantity: 1 }],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addVariant & SKU validation', () => {
    it('should throw BadRequestException if SKU already exists', async () => {
      mockSupabaseService.admin.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'prod-1', shop_id: 'shop-1' },
                }),
              }),
            }),
          };
        }
        if (table === 'shops') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'shop-1', seller_id: 'seller-1' },
                }),
              }),
            }),
          };
        }
        if (table === 'product_variants') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'existing-var-with-sku' },
                }),
              }),
            }),
          };
        }
        return {};
      });

      await expect(
        service.addVariant('seller-1', 'prod-1', {
          sku: 'DUPLICATE-SKU',
          size: 'XL',
          color: 'Blue',
          price: 999,
          stockQuantity: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow seller to add new unique variant to their own product', async () => {
      mockSupabaseService.admin.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'prod-1', shop_id: 'shop-1' },
                }),
              }),
            }),
          };
        }
        if (table === 'shops') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'shop-1', seller_id: 'seller-1' },
                }),
              }),
            }),
          };
        }
        if (table === 'product_variants') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'var-new', sku: 'NEW-SKU-L', size: 'L', color: 'White', stock_quantity: 8 },
                  error: null,
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

      const variant = await service.addVariant('seller-1', 'prod-1', {
        sku: 'NEW-SKU-L',
        size: 'L',
        color: 'White',
        price: 999,
        stockQuantity: 8,
      });

      expect(variant.id).toBe('var-new');
      expect(variant.sku).toBe('NEW-SKU-L');
    });
  });

  describe('updateProduct & archiveProduct', () => {
    it('should allow seller to update their product metadata', async () => {
      mockSupabaseService.admin.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'prod-1', shop_id: 'shop-1' },
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'prod-1', name: 'Updated Shirt Title', base_price: 1099 },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'shops') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'shop-1', seller_id: 'seller-1' },
                }),
              }),
            }),
          };
        }
        return {};
      });

      const updated = await service.updateProduct('seller-1', 'prod-1', {
        name: 'Updated Shirt Title',
        basePrice: 1099,
      });

      expect(updated.name).toBe('Updated Shirt Title');
      expect(updated.base_price).toBe(1099);
    });

    it('should allow seller to archive product (soft delete)', async () => {
      mockSupabaseService.admin.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'prod-1', shop_id: 'shop-1' },
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'prod-1', status: 'ARCHIVED' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'shops') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'shop-1', seller_id: 'seller-1' },
                }),
              }),
            }),
          };
        }
        return {};
      });

      const archived = await service.archiveProduct('seller-1', 'prod-1');
      expect(archived.status).toBe('ARCHIVED');
    });
  });

  describe('listProducts & catalog discovery', () => {
    it('should filter in-stock products when inStockOnly=true', async () => {
      const mockProducts = [
        {
          id: 'p1',
          name: 'Available Kurta',
          product_variants: [{ id: 'v1', is_active: true, stock_quantity: 5 }],
        },
        {
          id: 'p2',
          name: 'Sold Out Sherwani',
          product_variants: [{ id: 'v2', is_active: true, stock_quantity: 0 }],
        },
      ];

      mockSupabaseService.admin.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockProducts, error: null }),
      });

      const inStockList = await service.listProducts({ inStockOnly: true });
      expect(inStockList.length).toBe(1);
      expect(inStockList[0].id).toBe('p1');
    });
  });
});
