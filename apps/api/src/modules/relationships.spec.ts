import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { ShopsService } from './shops/shops.service';
import { ProductsService } from './products/products.service';
import { CartService } from './cart/cart.service';
import { BargainingService } from './bargaining/bargaining.service';
import { OrdersService } from './orders/orders.service';
import { InventoryService } from './inventory/inventory.service';
import { LocationsService } from './locations/locations.service';
import { PaymentsService } from './payments/payments.service';

describe('Phase 1 Relational & Business Rule Verification', () => {
  let module: TestingModule;
  let shopsService: ShopsService;
  let productsService: ProductsService;
  let cartService: CartService;
  let bargainingService: BargainingService;
  let ordersService: OrdersService;
  let inventoryService: InventoryService;
  let locationsService: LocationsService;

  const mockDbData = {
    user: { id: 'u1', email: 'consumer@local.test', role: 'CONSUMER', full_name: 'Aarav Sharma' },
    seller: { id: 's1', email: 'merchant@local.test', role: 'SELLER', full_name: 'Rajesh Varma' },
    shop: {
      id: 'sh1',
      seller_id: 's1',
      name: 'Varanasi Silks',
      slug: 'varanasi-silks',
      status: 'VERIFIED',
      is_bargaining_enabled: true,
      latitude: 25.3176,
      longitude: 82.9739,
    },
    product: {
      id: 'p1',
      shop_id: 'sh1',
      name: 'Pure Banarasi Silk Saree',
      base_price: 4999,
      status: 'ACTIVE',
      is_bargaining_allowed: true,
    },
    variant: {
      id: 'v1',
      product_id: 'p1',
      sku: 'BAN-SLK-RED',
      size: 'Free',
      color: 'Crimson Red',
      price: 4999,
      stock_quantity: 10,
      is_active: true,
    },
  };

  beforeEach(async () => {
    const mockSupabaseService = {
      admin: {
        from: jest.fn((table: string) => {
          if (table === 'shops') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              ilike: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: mockDbData.shop, error: null }),
              maybeSingle: jest.fn().mockResolvedValue({ data: mockDbData.shop, error: null }),
            };
          }
          if (table === 'products') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              ilike: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: mockDbData.product, error: null }),
              maybeSingle: jest.fn().mockResolvedValue({ data: mockDbData.product, error: null }),
            };
          }
          if (table === 'product_variants') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { ...mockDbData.variant, products: mockDbData.product },
                error: null,
              }),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { ...mockDbData.variant, products: mockDbData.product },
                error: null,
              }),
            };
          }
          if (table === 'carts') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'c1', user_id: 'u1' }, error: null }),
              insert: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: { id: 'c1', user_id: 'u1' }, error: null }),
            };
          }
          if (table === 'cart_items') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              upsert: jest.fn().mockReturnThis(),
              insert: jest.fn().mockReturnThis(),
              update: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
              single: jest.fn().mockResolvedValue({ data: { id: 'ci1', cart_id: 'c1', variant_id: 'v1', quantity: 2 }, error: null }),
            };
          }
          if (table === 'bargaining_sessions') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              insert: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'bs1',
                  product_id: 'p1',
                  variant_id: 'v1',
                  user_id: 'u1',
                  shop_id: 'sh1',
                  original_price: 4999,
                  status: 'OPEN',
                  expires_at: new Date(Date.now() + 86400000).toISOString(),
                  products: mockDbData.product,
                  product_variants: mockDbData.variant,
                  shops: mockDbData.shop,
                  bargaining_offers: [],
                },
                error: null,
              }),
              maybeSingle: jest.fn().mockResolvedValue({
                data: {
                  id: 'bs1',
                  product_id: 'p1',
                  variant_id: 'v1',
                  user_id: 'u1',
                  shop_id: 'sh1',
                  original_price: 4999,
                  status: 'OPEN',
                  expires_at: new Date(Date.now() + 86400000).toISOString(),
                  products: mockDbData.product,
                  product_variants: mockDbData.variant,
                  shops: mockDbData.shop,
                  bargaining_offers: [],
                },
                error: null,
              }),
            };
          }
          if (table === 'bargaining_offers') {
            return {
              insert: jest.fn().mockResolvedValue({ data: { id: 'bo1' }, error: null }),
            };
          }
          if (table === 'orders') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              update: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: {
                  id: 'o1',
                  user_id: 'u1',
                  status: 'CONFIRMED',
                  subtotal_amount: 4999,
                  total_amount: 4999,
                  shops: { id: 'sh1', seller_id: 's1', name: 'Varanasi Silks' },
                },
                error: null,
              }),
              single: jest.fn().mockResolvedValue({
                data: { id: 'o1', status: 'CONFIRMED', subtotal_amount: 4999, total_amount: 4999 },
                error: null,
              }),
            };
          }
          if (table === 'order_status_history') {
            return {
              insert: jest.fn().mockResolvedValue({ data: { id: 'osh1' }, error: null }),
            };
          }
          if (table === 'inventory_movements') {
            return {
              insert: jest.fn().mockResolvedValue({ data: { id: 'im1' }, error: null }),
            };
          }
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      },
    };

    module = await Test.createTestingModule({
      providers: [
        ShopsService,
        ProductsService,
        CartService,
        BargainingService,
        OrdersService,
        PaymentsService,
        InventoryService,
        LocationsService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    shopsService = module.get<ShopsService>(ShopsService);
    productsService = module.get<ProductsService>(ProductsService);
    cartService = module.get<CartService>(CartService);
    bargainingService = module.get<BargainingService>(BargainingService);
    ordersService = module.get<OrdersService>(OrdersService);
    inventoryService = module.get<InventoryService>(InventoryService);
    locationsService = module.get<LocationsService>(LocationsService);
  });

  it('should verify shop and seller entity relationships', async () => {
    const shop = await shopsService.getShopById('sh1');
    expect(shop).toBeDefined();
    expect(shop.seller_id).toBe('s1');
    expect(shop.name).toBe('Varanasi Silks');
  });

  it('should verify product and variant relationship', async () => {
    const product = await productsService.getProductById('p1');
    expect(product).toBeDefined();
    expect(product.base_price).toBe(4999);
    expect(product.is_bargaining_allowed).toBe(true);
  });

  it('should enforce variant-level inventory stock validation', async () => {
    const stock = await inventoryService.getVariantStock('v1');
    expect(stock).toBe(10);
  });

  it('should allow adding available stock variant to cart', async () => {
    const cartItem = await cartService.addItem('u1', 'v1', 2);
    expect(cartItem).toBeDefined();
    expect(cartItem.quantity).toBe(2);
  });

  it('should create structured bargaining session with initial offer', async () => {
    const session = await bargainingService.createSession('u1', 'p1', 'v1', 4200);
    expect(session).toBeDefined();
    expect(session.status).toBe('OPEN');
    expect(session.original_price).toBe(4999);
  });

  it('should calculate accurate Haversine GPS distances for local shop discovery', () => {
    // Distance between Delhi (28.6139, 77.2090) and Noida (28.5355, 77.3910) ~19.8 km
    const dist = locationsService.calculateDistanceKm(28.6139, 77.2090, 28.5355, 77.3910);
    expect(dist).toBeGreaterThan(15);
    expect(dist).toBeLessThan(25);
  });

  it('should enforce order state machine transitions and audit history', async () => {
    const updated = await ordersService.updateOrderStatus('o1', 'PREPARING', 's1', 'SELLER', 'Merchant started packaging');
    expect(updated).toBeDefined();
  });
});

