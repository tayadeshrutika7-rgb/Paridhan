import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { LocationsService } from '../locations/locations.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { BadRequestException } from '@nestjs/common';

describe('SearchService & Discovery (Phase 4)', () => {
  let service: SearchService;
  let locationsService: LocationsService;

  // Mock catalog dataset in Rajasthan & Delhi
  const mockProducts = [
    {
      id: 'p1',
      name: 'Classic Casual Linen Shirt',
      description: 'Breathable summer casual shirt with pearl buttons',
      base_price: 1299,
      rating: 4.8,
      status: 'ACTIVE',
      is_bargaining_allowed: true,
      created_at: '2026-09-10T10:00:00Z',
      shop_id: 'shop-jaipur-1',
      shops: {
        id: 'shop-jaipur-1',
        name: 'Pink City Handlooms',
        city: 'Jaipur',
        latitude: 26.9124,
        longitude: 75.7873,
        rating: 4.8,
        is_bargaining_enabled: true,
      },
      categories: { id: 'cat-shirts', name: 'Shirts', slug: 'shirts' },
      product_variants: [
        { id: 'v1', size: 'M', color: 'White', price: 1299, stock_quantity: 10, is_active: true },
        { id: 'v2', size: 'L', color: 'White', price: 1299, stock_quantity: 0, is_active: true },
        { id: 'v3', size: 'M', color: 'Blue', price: 1399, stock_quantity: 5, is_active: true },
      ],
    },
    {
      id: 'p2',
      name: 'Designer Silk Saree',
      description: 'Pure Banarasi Zari border saree for weddings',
      base_price: 5499,
      rating: 4.9,
      status: 'ACTIVE',
      is_bargaining_allowed: false,
      created_at: '2026-09-08T10:00:00Z',
      shop_id: 'shop-jaipur-2',
      shops: {
        id: 'shop-jaipur-2',
        name: 'Varanasi Silks Depot',
        city: 'Jaipur',
        latitude: 26.9200,
        longitude: 75.8000,
        rating: 4.9,
        is_bargaining_enabled: true,
      },
      categories: { id: 'cat-ethnic', name: 'Ethnic Wear', slug: 'ethnic' },
      product_variants: [
        { id: 'v4', size: 'Free', color: 'Crimson', price: 5499, stock_quantity: 4, is_active: true },
      ],
    },
    {
      id: 'p3',
      name: 'Casual Denim Jacket',
      description: 'Rugged vintage blue denim jacket',
      base_price: 2499,
      rating: 4.5,
      status: 'ACTIVE',
      is_bargaining_allowed: true,
      created_at: '2026-09-12T08:00:00Z',
      shop_id: 'shop-delhi-1',
      shops: {
        id: 'shop-delhi-1',
        name: 'Chandni Chowk Apparel',
        city: 'Delhi',
        latitude: 28.6500,
        longitude: 77.2300,
        rating: 4.5,
        is_bargaining_enabled: false,
      },
      categories: { id: 'cat-jackets', name: 'Jackets', slug: 'jackets' },
      product_variants: [
        { id: 'v5', size: 'L', color: 'Blue', price: 2499, stock_quantity: 0, is_active: true },
      ],
    },
  ];

  const mockShops = [
    {
      id: 'shop-jaipur-1',
      name: 'Pink City Handlooms',
      description: 'Authentic Rajasthani handloom shirts and kurtas',
      city: 'Jaipur',
      latitude: 26.9124,
      longitude: 75.7873,
      rating: 4.8,
      status: 'VERIFIED',
      is_bargaining_enabled: true,
    },
    {
      id: 'shop-jaipur-2',
      name: 'Varanasi Silks Depot',
      description: 'Bridal wear and heavy pure silk sarees',
      city: 'Jaipur',
      latitude: 26.9200,
      longitude: 75.8000,
      rating: 4.9,
      status: 'VERIFIED',
      is_bargaining_enabled: true,
    },
    {
      id: 'shop-delhi-1',
      name: 'Chandni Chowk Apparel',
      description: 'Wholesale and retail modern apparel',
      city: 'Delhi',
      latitude: 28.6500,
      longitude: 77.2300,
      rating: 4.5,
      status: 'VERIFIED',
      is_bargaining_enabled: false,
    },
  ];

  const mockSupabaseAdmin = {
    from: jest.fn((table: string) => {
      if (table === 'products') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockProducts, error: null }),
        };
      }
      if (table === 'shops') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockShops, error: null }),
        };
      }
      if (table === 'search_history') {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        LocationsService,
        {
          provide: SupabaseService,
          useValue: { admin: mockSupabaseAdmin },
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    locationsService = module.get<LocationsService>(LocationsService);
  });

  describe('1. Search Relevance & Text Matching', () => {
    it('should find products by matching title terms ("casual shirt")', async () => {
      const result = await service.searchProducts({ query: 'casual shirt' });
      expect(result.total).toBe(1);
      expect(result.data[0].id).toBe('p1');
    });

    it('should find products by matching category name ("Ethnic")', async () => {
      const result = await service.searchProducts({ query: 'Ethnic' });
      expect(result.total).toBe(1);
      expect(result.data[0].id).toBe('p2');
    });

    it('should find products by matching shop name ("Pink City")', async () => {
      const result = await service.searchProducts({ query: 'Pink City' });
      expect(result.total).toBe(1);
      expect(result.data[0].id).toBe('p1');
    });
  });

  describe('2. Multi-Attribute Filters', () => {
    it('should filter products by price range (under ₹1500)', async () => {
      const result = await service.searchProducts({ maxPrice: 1500 });
      expect(result.total).toBe(1);
      expect(result.data[0].id).toBe('p1');
    });

    it('should filter products by variant Size ("M")', async () => {
      const result = await service.searchProducts({ size: 'M' });
      expect(result.total).toBe(1);
      expect(result.data[0].id).toBe('p1');
    });

    it('should filter products by variant Color ("Crimson")', async () => {
      const result = await service.searchProducts({ color: 'Crimson' });
      expect(result.total).toBe(1);
      expect(result.data[0].id).toBe('p2');
    });

    it('should filter products with inStockOnly=true', async () => {
      const result = await service.searchProducts({ inStockOnly: true });
      // p1 and p2 have stock > 0, p3 has only 0 stock
      expect(result.total).toBe(2);
      expect(result.data.map((p) => p.id)).toEqual(['p1', 'p2']);
    });

    it('should filter products where bargaining is allowed', async () => {
      const result = await service.searchProducts({ isBargainingAllowed: true });
      expect(result.total).toBe(1);
      expect(result.data[0].id).toBe('p1');
    });
  });

  describe('3. Sorting Options', () => {
    it('should sort by PRICE_ASC (lowest price first)', async () => {
      const result = await service.searchProducts({ sortBy: 'PRICE_ASC' });
      expect(result.data[0].base_price).toBe(1299);
      expect(result.data[result.data.length - 1].base_price).toBe(5499);
    });

    it('should sort by PRICE_DESC (highest price first)', async () => {
      const result = await service.searchProducts({ sortBy: 'PRICE_DESC' });
      expect(result.data[0].base_price).toBe(5499);
      expect(result.data[result.data.length - 1].base_price).toBe(1299);
    });

    it('should sort by RATING_DESC (highest rated first)', async () => {
      const result = await service.searchProducts({ sortBy: 'RATING_DESC' });
      expect(result.data[0].id).toBe('p2'); // 4.9 rating
    });

    it('should sort by NEWEST (most recently created first)', async () => {
      const result = await service.searchProducts({ sortBy: 'NEWEST' });
      expect(result.data[0].id).toBe('p3'); // 2026-09-12
    });
  });

  describe('4. Distance Calculation & Nearby Radius Discovery', () => {
    it('should calculate GPS distance and filter out shops outside search radius', async () => {
      // User is in central Jaipur (26.9124, 75.7873) with 15km radius
      const result = await service.searchProducts({
        latitude: 26.9124,
        longitude: 75.7873,
        radiusKm: 15,
        sortBy: 'DISTANCE_ASC',
      });

      // Should return Jaipur products (p1, p2) and filter out Delhi (p3 ~240km away)
      expect(result.total).toBe(2);
      expect(result.data[0].id).toBe('p1');
      expect(result.data[0].distanceKm).toBeCloseTo(0, 1);
      expect(result.data[1].id).toBe('p2');
      expect(result.data[1].distanceKm).toBeLessThan(5);
    });

    it('should calculate distance for nearby shops search', async () => {
      const nearby = await locationsService.findNearbyShops(26.9124, 75.7873, 10);
      expect(nearby.length).toBe(2);
      expect(nearby[0].id).toBe('shop-jaipur-1');
      expect(nearby[0].distanceKm).toBe(0);
    });
  });

  describe('5. Acceptance Criteria: Compound Natural Language Query', () => {
    it('should satisfy: "casual shirt under ₹1500 size M near me"', async () => {
      const result = await service.searchProducts({
        query: 'casual shirt',
        maxPrice: 1500,
        size: 'M',
        latitude: 26.9124,
        longitude: 75.7873,
        radiusKm: 25,
      });

      expect(result.total).toBe(1);
      expect(result.data[0].name).toBe('Classic Casual Linen Shirt');
      expect(result.data[0].base_price).toBeLessThanOrEqual(1500);
      expect(result.data[0].distanceKm).toBeDefined();
    });
  });

  describe('6. Empty Results & Edge Cases', () => {
    it('should return empty data array when no products match', async () => {
      const result = await service.searchProducts({ query: 'nonexistent astronaut suit 9999' });
      expect(result.total).toBe(0);
      expect(result.data).toEqual([]);
      expect(result.totalPages).toBe(1);
    });

    it('should throw BadRequestException on invalid coordinates', () => {
      expect(() => locationsService.validateCoordinates(95, 200)).toThrow(BadRequestException);
      expect(() => locationsService.validateCoordinates(-95, 0)).toThrow(BadRequestException);
    });
  });

  describe('7. Pagination', () => {
    it('should paginate results with page, limit, total, and totalPages', async () => {
      const result = await service.searchProducts({ page: 1, limit: 2 });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(2);
      expect(result.data.length).toBe(2);

      const page2 = await service.searchProducts({ page: 2, limit: 2 });
      expect(page2.page).toBe(2);
      expect(page2.data.length).toBe(1);
    });
  });
});
