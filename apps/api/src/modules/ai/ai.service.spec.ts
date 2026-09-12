import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('AiService & Tools Suite (Phase 9/10 / Checklist)', () => {
  let service: AiService;

  const mockDb = {
    products: [
      {
        id: 'prod-1',
        name: 'Royal Silk Kurta',
        slug: 'royal-silk-kurta',
        base_price: 2500,
        rating: 4.8,
        status: 'ACTIVE',
        is_bargaining_allowed: true,
        shop: { id: 'shop-1', name: 'Jaipur Silks', city: 'Jaipur', status: 'VERIFIED' },
        product_variants: [
          { id: 'var-1', sku: 'RSK-M', size: 'M', color: 'Blue', price: 2500, stock_quantity: 5, is_active: true },
        ],
      },
    ],
    product_variants: [
      { id: 'var-1', sku: 'RSK-M', size: 'M', color: 'Blue', price: 2500, stock_quantity: 5, is_active: true, product_id: 'prod-1' },
    ],
    shops: [
      { id: 'shop-1', name: 'Jaipur Silks', city: 'Jaipur', status: 'VERIFIED', rating: 4.9 },
    ],
    orders: [
      {
        id: 'order-1',
        order_number: 'ORD-1001',
        user_id: 'user-consumer-1',
        status: 'CONFIRMED',
        payment_status: 'PAID',
        total_amount: 2500,
        order_items: [{ id: 'item-1', product_name: 'Royal Silk Kurta', quantity: 1, total_price: 2500 }],
        deliveries: [{ id: 'del-1', status: 'ASSIGNED' }],
      },
    ],
    ai_conversations: [] as any[],
    ai_messages: [] as any[],
  };

  const createMockSupabase = () => ({
    admin: {
      from: jest.fn().mockImplementation((table: string) => {
        let currentTable = (mockDb as any)[table] || [];
        const builder: any = {
          _filtered: [...currentTable],
          select: jest.fn().mockImplementation(() => builder),
          eq: jest.fn().mockImplementation((col: string, val: any) => {
            builder._filtered = builder._filtered.filter((item: any) => item[col] === val);
            return builder;
          }),
          gte: jest.fn().mockImplementation((col: string, val: any) => {
            builder._filtered = builder._filtered.filter((item: any) => item[col] >= val);
            return builder;
          }),
          lte: jest.fn().mockImplementation((col: string, val: any) => {
            builder._filtered = builder._filtered.filter((item: any) => item[col] <= val);
            return builder;
          }),
          ilike: jest.fn().mockImplementation((col: string, val: string) => {
            const clean = val.replace(/%/g, '').toLowerCase();
            builder._filtered = builder._filtered.filter((item: any) =>
              (item[col] || '').toLowerCase().includes(clean),
            );
            return builder;
          }),
          order: jest.fn().mockImplementation(() => builder),
          limit: jest.fn().mockImplementation((n: number) => {
            const sliced = builder._filtered.slice(0, n);
            return Promise.resolve({ data: sliced, error: null });
          }),
          single: jest.fn().mockImplementation(() => {
            const item = builder._filtered[0] || null;
            return Promise.resolve({ data: item, error: item ? null : { message: 'Not found' } });
          }),
          maybeSingle: jest.fn().mockImplementation(() => {
            const item = builder._filtered[0] || null;
            return Promise.resolve({ data: item, error: null });
          }),
          insert: jest.fn().mockImplementation((payload: any) => {
            const records = Array.isArray(payload) ? payload : [payload];
            const inserted = records.map((r) => ({ id: r.id || 'gen-id', ...r }));
            currentTable.push(...inserted);
            return {
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: inserted[0], error: null }),
              }),
            };
          }),
          then: (resolve: any) => resolve({ data: builder._filtered, error: null }),
        };
        return builder;
      }),
    },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: SupabaseService,
          useValue: createMockSupabase(),
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('Tool 1: toolSearchProducts returns authoritative product matches', async () => {
    const result = await service.toolSearchProducts({ query: 'Silk', maxPrice: 3000 });
    expect(result.tool).toBe('product_search');
    expect(result.count).toBe(1);
    expect(result.products[0].name).toBe('Royal Silk Kurta');
  });

  it('Tool 2: toolSearchShops returns verified local shops', async () => {
    const result = await service.toolSearchShops({ query: 'Jaipur', city: 'Jaipur' });
    expect(result.tool).toBe('shop_search');
    expect(result.count).toBe(1);
    expect(result.shops[0].name).toBe('Jaipur Silks');
  });

  it('Tool 3: toolLookupProduct returns product by slug or id', async () => {
    const result = await service.toolLookupProduct('royal-silk-kurta');
    expect(result.tool).toBe('product_lookup');
    expect(result.product.name).toBe('Royal Silk Kurta');
  });

  it('Tool 3: toolLookupProduct throws NotFoundException for invalid slug', async () => {
    await expect(service.toolLookupProduct('non-existent')).rejects.toThrow(NotFoundException);
  });

  it('Tool 4: toolLookupVariant returns variant details and stock boolean', async () => {
    const result = await service.toolLookupVariant('var-1');
    expect(result.tool).toBe('variant_lookup');
    expect(result.inStock).toBe(true);
    expect(result.variant.sku).toBe('RSK-M');
  });

  it('Tool 5: toolLookupOrder returns order for authorized owner', async () => {
    const result = await service.toolLookupOrder('ORD-1001', 'user-consumer-1');
    expect(result.tool).toBe('order_lookup');
    expect(result.order.order_number).toBe('ORD-1001');
  });

  it('Tool 5: toolLookupOrder throws ForbiddenException for unauthorized user', async () => {
    await expect(service.toolLookupOrder('ORD-1001', 'unauthorized-user')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('Tool 6: toolGetRecommendations returns style-oriented recommendations', async () => {
    const result = await service.toolGetRecommendations({ style: 'ethnic', preferredPriceMax: 3000 });
    expect(result.tool).toBe('fashion_recommendation');
    expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
  });

  it('processFashionQuery performs conversational search and records conversation', async () => {
    const result = await service.processFashionQuery('Silk Kurta', 'user-consumer-1');
    expect(result.conversationId).toBeDefined();
    expect(result.recommendedProducts.length).toBe(1);
    expect(result.disclaimer).toBeDefined();
  });
});
