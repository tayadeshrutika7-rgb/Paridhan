import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../../supabase/supabase.service';
import { SupabaseAuthGuard } from '../../supabase/guards/supabase-auth.guard';
import { RolesGuard } from '../../supabase/guards/roles.guard';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { ProductsService } from '../products/products.service';
import { ShopsService } from '../shops/shops.service';
import { DeliveryService } from '../delivery/delivery.service';
import { AdminService } from '../admin/admin.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ConfigService } from '@nestjs/config';

describe('Phase 2 Security & RBAC Suite', () => {
  let module: TestingModule;
  let authGuard: SupabaseAuthGuard;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;
  let ordersService: OrdersService;
  let productsService: ProductsService;
  let shopsService: ShopsService;
  let deliveryService: DeliveryService;
  let adminService: AdminService;

  // Mock Database State for Security Scenarios
  const mockDb = {
    consumers: {
      a: { id: 'usr-consumer-a', email: 'consumer.a@test.com', role: 'CONSUMER', full_name: 'Consumer Alpha' },
      b: { id: 'usr-consumer-b', email: 'consumer.b@test.com', role: 'CONSUMER', full_name: 'Consumer Beta' },
    },
    sellers: {
      a: { id: 'usr-seller-a', email: 'seller.a@test.com', role: 'SELLER', full_name: 'Seller Alpha' },
      b: { id: 'usr-seller-b', email: 'seller.b@test.com', role: 'SELLER', full_name: 'Seller Beta' },
    },
    deliveryPartners: {
      a: { id: 'usr-driver-a', email: 'driver.a@test.com', role: 'DELIVERY_PARTNER', full_name: 'Driver Alpha' },
      b: { id: 'usr-driver-b', email: 'driver.b@test.com', role: 'DELIVERY_PARTNER', full_name: 'Driver Beta' },
    },
    admins: {
      main: { id: 'usr-admin-1', email: 'admin@test.com', role: 'ADMIN', full_name: 'Admin Boss' },
    },
    shops: {
      shopA: { id: 'shop-a', seller_id: 'usr-seller-a', name: 'Alpha Couture' },
      shopB: { id: 'shop-b', seller_id: 'usr-seller-b', name: 'Beta Boutique' },
    },
    products: {
      prodA: { id: 'prod-a', shop_id: 'shop-a', name: 'Alpha Silk Kurta', base_price: 1999 },
      prodB: { id: 'prod-b', shop_id: 'shop-b', name: 'Beta Cotton Shirt', base_price: 999 },
    },
    orders: {
      orderA: {
        id: 'ord-a',
        user_id: 'usr-consumer-a',
        shop_id: 'shop-a',
        status: 'CONFIRMED',
        total_amount: 1999,
        shops: { id: 'shop-a', seller_id: 'usr-seller-a', name: 'Alpha Couture' },
        deliveries: [{ id: 'del-a', delivery_partner_id: 'usr-driver-a', status: 'ASSIGNED' }],
      },
      orderB: {
        id: 'ord-b',
        user_id: 'usr-consumer-b',
        shop_id: 'shop-b',
        status: 'CONFIRMED',
        total_amount: 999,
        shops: { id: 'shop-b', seller_id: 'usr-seller-b', name: 'Beta Boutique' },
        deliveries: [{ id: 'del-b', delivery_partner_id: 'usr-driver-b', status: 'ASSIGNED' }],
      },
    },
    deliveries: {
      delA: { id: 'del-a', order_id: 'ord-a', delivery_partner_id: 'usr-driver-a', status: 'ASSIGNED' },
      delB: { id: 'del-b', order_id: 'ord-b', delivery_partner_id: 'usr-driver-b', status: 'ASSIGNED' },
    },
  };

  const mockSupabaseAdmin = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn((field, val) => ({
            maybeSingle: jest.fn().mockImplementation(async () => {
              const allUsers = [
                ...Object.values(mockDb.consumers),
                ...Object.values(mockDb.sellers),
                ...Object.values(mockDb.deliveryPartners),
                ...Object.values(mockDb.admins),
              ];
              const found = allUsers.find((u) => u.id === val);
              return { data: found || null, error: null };
            }),
          })),
        };
      }
      if (table === 'orders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn((field, val) => ({
            maybeSingle: jest.fn().mockImplementation(async () => {
              const order = Object.values(mockDb.orders).find((o) => o.id === val);
              return { data: order || null, error: null };
            }),
          })),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: 'ord-a', status: 'CANCELLED' }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'order_status_history') {
        return {
          insert: jest.fn().mockResolvedValue({ data: { id: 'osh-1' }, error: null }),
        };
      }
      if (table === 'shops') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn((field, val) => ({
            maybeSingle: jest.fn().mockImplementation(async () => {
              const shop = Object.values(mockDb.shops).find((s) => s.id === val || s.seller_id === val);
              return { data: shop || null, error: null };
            }),
          })),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockDb.shops.shopA, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'products') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn((field, val) => ({
            maybeSingle: jest.fn().mockImplementation(async () => {
              const prod = Object.values(mockDb.products).find((p) => p.id === val);
              return { data: prod || null, error: null };
            }),
          })),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockDb.products.prodA, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'product_variants') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'var-new' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'deliveries') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn((field, val) => ({
            maybeSingle: jest.fn().mockImplementation(async () => {
              const del = Object.values(mockDb.deliveries).find((d) => d.id === val);
              return { data: del || null, error: null };
            }),
          })),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockDb.deliveries.delA, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'delivery_status_history') {
        return {
          insert: jest.fn().mockResolvedValue({ data: { id: 'dsh-1' }, error: null }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  };

  const createMockContext = (headers: Record<string, string>, user?: any): any => {
    const request = { headers, user };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };
  };

  beforeAll(async () => {
    reflector = new Reflector();
    const mockSupabase = {
      admin: mockSupabaseAdmin,
      client: mockSupabaseAdmin,
    };

    module = await Test.createTestingModule({
      providers: [
        OrdersService,
        PaymentsService,
        ProductsService,
        ShopsService,
        DeliveryService,
        AdminService,
        AuditLogsService,
        { provide: SupabaseService, useValue: mockSupabase },

        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    ordersService = module.get<OrdersService>(OrdersService);
    productsService = module.get<ProductsService>(ProductsService);
    shopsService = module.get<ShopsService>(ShopsService);
    deliveryService = module.get<DeliveryService>(DeliveryService);
    adminService = module.get<AdminService>(AdminService);
    authGuard = new SupabaseAuthGuard(mockSupabase as any, reflector);
    rolesGuard = new RolesGuard(reflector);
  });


  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
  });



  describe('Scenario 1: Consumer Cross-Tenant Isolation (Consumer → Another consumer\'s order)', () => {
    it('should ALLOW Consumer A to fetch their own order (Order A)', async () => {
      const order = await ordersService.getOrderById('ord-a', mockDb.consumers.a.id, 'CONSUMER');
      expect(order).toBeDefined();
      expect(order.id).toBe('ord-a');
      expect(order.user_id).toBe(mockDb.consumers.a.id);
    });

    it('should DENY Consumer A when attempting to fetch Consumer B\'s order (Order B)', async () => {
      await expect(
        ordersService.getOrderById('ord-b', mockDb.consumers.a.id, 'CONSUMER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should DENY Consumer A when attempting to cancel Consumer B\'s order', async () => {
      await expect(
        ordersService.updateOrderStatus('ord-b', 'CANCELLED', mockDb.consumers.a.id, 'CONSUMER'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Scenario 2: Seller Cross-Tenant Isolation (Seller A → Seller B\'s product/shop)', () => {
    it('should ALLOW Seller A to update their own product (Product A)', async () => {
      const updated = await productsService.updateProduct(mockDb.sellers.a.id, 'prod-a', {
        name: 'Updated Alpha Saree',
      });
      expect(updated).toBeDefined();
    });

    it('should DENY Seller A when attempting to modify Seller B\'s product (Product B)', async () => {
      await expect(
        productsService.updateProduct(mockDb.sellers.a.id, 'prod-b', {
          name: 'Hacked Shirt Name',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should DENY Seller A when attempting to add variants to Seller B\'s product (Product B)', async () => {
      await expect(
        productsService.addVariant(mockDb.sellers.a.id, 'prod-b', {
          sku: 'INTRUDER-SKU',
          size: 'XL',
          color: 'Black',
          price: 100,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should DENY Seller A when attempting to update Seller B\'s shop (Shop B)', async () => {
      await expect(
        shopsService.updateShop(mockDb.sellers.a.id, 'shop-b', {
          name: 'Hijacked Shop Name',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Scenario 3: Privilege Escalation (Seller/Consumer → Admin Endpoint)', () => {
    it('should DENY Seller when accessing an ADMIN-only endpoint via RolesGuard', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
      const sellerContext = createMockContext({}, { role: 'SELLER', id: mockDb.sellers.a.id });

      expect(() => rolesGuard.canActivate(sellerContext)).toThrow(ForbiddenException);
    });

    it('should DENY Consumer when accessing an ADMIN-only endpoint via RolesGuard', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
      const consumerContext = createMockContext({}, { role: 'CONSUMER', id: mockDb.consumers.a.id });

      expect(() => rolesGuard.canActivate(consumerContext)).toThrow(ForbiddenException);
    });

    it('should ALLOW Admin when accessing an ADMIN-only endpoint', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
      const adminContext = createMockContext({}, { role: 'ADMIN', id: mockDb.admins.main.id });

      expect(rolesGuard.canActivate(adminContext)).toBe(true);
    });
  });

  describe('Scenario 4: Delivery Partner Isolation (Delivery Partner → Unrelated Delivery)', () => {
    it('should ALLOW Driver A to view their assigned delivery (Delivery A)', async () => {
      const delivery = await deliveryService.getDeliveryById('del-a', mockDb.deliveryPartners.a.id, 'DELIVERY_PARTNER');
      expect(delivery).toBeDefined();
      expect(delivery.id).toBe('del-a');
    });

    it('should DENY Driver A when attempting to view Driver B\'s delivery (Delivery B)', async () => {
      await expect(
        deliveryService.getDeliveryById('del-b', mockDb.deliveryPartners.a.id, 'DELIVERY_PARTNER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should DENY Driver A when attempting to update status of Driver B\'s delivery (Delivery B)', async () => {
      await expect(
        deliveryService.updateDeliveryStatus('del-b', 'DELIVERED', mockDb.deliveryPartners.a.id, 'DELIVERY_PARTNER'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Scenario 5: Unauthenticated Access (Missing / Invalid Token → Protected Endpoints)', () => {
    it('should REJECT request with missing Authorization header', async () => {
      const context = createMockContext({});
      await expect(authGuard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should REJECT request with invalid Bearer token prefix', async () => {
      const context = createMockContext({ authorization: 'Token abcdef' });
      await expect(authGuard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should REJECT request when Supabase JWT is expired or tampered', async () => {
      mockSupabaseAdmin.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid JWT signature' },
      });

      const context = createMockContext({ authorization: 'Bearer malformed.or.expired.jwt' });
      await expect(authGuard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should ACCEPT request with valid Supabase JWT and populate authoritative user context', async () => {
      mockSupabaseAdmin.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'usr-consumer-a',
            email: 'consumer.a@test.com',
            user_metadata: { role: 'CONSUMER' },
            created_at: '2026-09-08T00:00:00Z',
          },
        },
        error: null,
      });

      const context = createMockContext({ authorization: 'Bearer valid.jwt.token' });
      const allowed = await authGuard.canActivate(context);

      expect(allowed).toBe(true);
      const req = context.switchToHttp().getRequest();
      expect(req.user.id).toBe('usr-consumer-a');
      expect(req.user.role).toBe('CONSUMER');
    });
  });
});
