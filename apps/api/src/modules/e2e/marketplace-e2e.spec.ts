import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { ShopsService } from '../shops/shops.service';
import { ProductsService } from '../products/products.service';
import { InventoryService } from '../inventory/inventory.service';
import { SearchService } from '../search/search.service';
import { CartService } from '../cart/cart.service';
import { WishlistService } from '../wishlist/wishlist.service';
import { BargainingService } from '../bargaining/bargaining.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { DeliveryService } from '../delivery/delivery.service';
import { AdminService } from '../admin/admin.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { LocationsService } from '../locations/locations.service';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../supabase/supabase.service';
import * as crypto from 'crypto';


describe('Final E2E Multi-Role Marketplace Lifecycle', () => {
  let authService: AuthService;
  let shopsService: ShopsService;
  let productsService: ProductsService;
  let inventoryService: InventoryService;
  let searchService: SearchService;
  let cartService: CartService;
  let wishlistService: WishlistService;
  let bargainingService: BargainingService;
  let ordersService: OrdersService;
  let paymentsService: PaymentsService;
  let deliveryService: DeliveryService;
  let adminService: AdminService;
  let auditLogsService: AuditLogsService;

  // In-Memory Database State for E2E
  const db: {
    users: any[];
    shops: any[];
    products: any[];
    product_variants: any[];
    product_images: any[];
    inventory_items: any[];
    carts: any[];
    cart_items: any[];
    wishlists: any[];
    wishlist_items: any[];
    bargaining_sessions: any[];
    bargaining_offers: any[];
    orders: any[];
    order_items: any[];
    order_status_history: any[];
    payments: any[];
    deliveries: any[];
    reviews: any[];
    complaints: any[];
    platform_settings: any[];
    audit_logs: any[];
    user_addresses: any[];
    inventory_movements: any[];
  } = {
    users: [],
    shops: [],
    products: [],
    product_variants: [],
    product_images: [],
    inventory_items: [],
    inventory_movements: [],
    carts: [],
    cart_items: [],
    wishlists: [],
    wishlist_items: [],
    bargaining_sessions: [],
    bargaining_offers: [],
    orders: [],
    order_items: [],
    order_status_history: [],
    payments: [],
    deliveries: [],
    reviews: [],
    complaints: [],
    platform_settings: [],
    audit_logs: [],
    user_addresses: [],
  };

  const createMockSupabase = () => ({
    admin: {
      from: jest.fn().mockImplementation((tableName: keyof typeof db) => {
        if (!db[tableName]) {
          db[tableName] = [];
        }
        let currentTable = db[tableName];
        const builder: any = {
          _filtered: [...currentTable],
          select: jest.fn().mockImplementation((cols?: string, options?: any) => {
            if (options?.head && options?.count === 'exact') {
              builder._isHead = true;
            }
            if (tableName === 'products') {
              builder._filtered = builder._filtered.map((item: any) => {
                const variants = db.product_variants.filter((v) => v.product_id === item.id);
                const images = db.product_images.filter((img) => img.product_id === item.id);
                const shop = db.shops.find((s) => s.id === item.shop_id);
                return {
                  ...item,
                  product_variants: variants,
                  product_images: images,
                  shops: shop,
                };
              });
            }
            if (tableName === 'product_variants') {
              builder._filtered = builder._filtered.map((item: any) => {
                const prod = db.products.find((p) => p.id === item.product_id);
                const shop = prod ? db.shops.find((s) => s.id === prod.shop_id) : null;
                return {
                  ...item,
                  products: prod ? { ...prod, shops: shop } : null,
                };
              });
            }
            if (tableName === 'wishlist_items') {
              builder._filtered = builder._filtered.map((item: any) => {
                const prod = db.products.find((p) => p.id === item.product_id);
                const variants = db.product_variants.filter((v) => v.product_id === item.product_id);
                const shop = db.shops.find((s) => s.id === prod?.shop_id);
                return {
                  ...item,
                  products: prod ? { ...prod, product_variants: variants, shops: shop } : null,
                };
              });
            }
            if (tableName === 'cart_items') {
              builder._filtered = builder._filtered.map((item: any) => {
                const variant = db.product_variants.find((v) => v.id === item.variant_id || v.id === item.product_variant_id);
                const prod = db.products.find((p) => p.id === variant?.product_id);
                const shop = db.shops.find((s) => s.id === prod?.shop_id);
                const session = db.bargaining_sessions.find((b) => b.id === item.bargaining_session_id);
                return {
                  ...item,
                  product_variants: variant ? { ...variant, products: prod ? { ...prod, shops: shop } : null } : null,
                  bargaining_sessions: session || null,
                };
              });
            }
            if (tableName === 'bargaining_sessions') {
              builder._filtered = builder._filtered.map((item: any) => {
                const prod = db.products.find((p) => p.id === item.product_id);
                const variant = db.product_variants.find((v) => v.id === item.product_variant_id);
                const shop = db.shops.find((s) => s.id === item.shop_id || s.id === prod?.shop_id);
                const offers = db.bargaining_offers.filter((o) => o.session_id === item.id || o.bargaining_session_id === item.id);
                return {
                  ...item,
                  products: prod,
                  product_variants: variant,
                  shops: shop,
                  bargaining_offers: offers,
                };
              });
            }
            if (tableName === 'orders') {
              builder._filtered = builder._filtered.map((item: any) => {
                const items = db.order_items.filter((oi) => oi.order_id === item.id);
                const history = db.order_status_history.filter((h) => h.order_id === item.id);
                const shop = db.shops.find((s) => s.id === item.shop_id);
                const address = db.user_addresses.find((a) => a.id === item.address_id);
                const delivery = db.deliveries.find((d) => d.order_id === item.id);
                const payment = db.payments.find((p) => p.order_id === item.id);
                return {
                  ...item,
                  order_items: items,
                  order_status_history: history,
                  shops: shop,
                  user_addresses: address,
                  deliveries: delivery ? [delivery] : [],
                  payments: payment ? [payment] : [],
                };
              });
            }
            if (tableName === 'deliveries') {
              builder._filtered = builder._filtered.map((item: any) => {
                const order = db.orders.find((o) => o.id === item.order_id);
                const shop = order ? db.shops.find((s) => s.id === order.shop_id) : null;
                const address = order ? db.user_addresses.find((a) => a.id === order.address_id) : null;
                const items = order ? db.order_items.filter((oi) => oi.order_id === order.id) : [];
                return {
                  ...item,
                  orders: order ? { ...order, shops: shop, user_addresses: address, order_items: items } : null,
                };
              });
            }
            return builder;
          }),
          eq: jest.fn().mockImplementation((col: string, val: any) => {
            builder._filtered = builder._filtered.filter((item: any) => item[col] === val);
            return builder;
          }),
          in: jest.fn().mockImplementation((col: string, vals: any[]) => {
            builder._filtered = builder._filtered.filter((item: any) => vals.includes(item[col]));
            return builder;
          }),
          is: jest.fn().mockImplementation((col: string, val: any) => {
            builder._filtered = builder._filtered.filter((item: any) => item[col] === val);
            return builder;
          }),
          order: jest.fn().mockImplementation(() => builder),
          range: jest.fn().mockImplementation((start: number, end: number) => {
            const sliced = builder._filtered.slice(start, end + 1);
            return Promise.resolve({ data: sliced, count: builder._filtered.length, error: null });
          }),
          limit: jest.fn().mockImplementation((n: number) => {
            const sliced = builder._filtered.slice(0, n);
            return Promise.resolve({ data: sliced, count: builder._filtered.length, error: null });
          }),
          single: jest.fn().mockImplementation(() => {
            const item = builder._filtered[0] || null;
            return Promise.resolve({ data: item, error: item ? null : { message: 'Not found' } });
          }),
          maybeSingle: jest.fn().mockImplementation(() => {
            const item = builder._filtered[0] || null;
            return Promise.resolve({ data: item, error: null });
          }),
          then: (resolve: any) => resolve({ data: builder._isHead ? null : builder._filtered, count: builder._filtered.length, error: null }),

          insert: jest.fn().mockImplementation((payload: any) => {
            const records = Array.isArray(payload) ? payload : [payload];
            const inserted = records.map((r) => ({
              id: r.id || crypto.randomUUID(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...r,
            }));
            currentTable.push(...inserted);

            return {
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: inserted[0], error: null }),
                then: (resolve: any) => resolve({ data: inserted, error: null }),
              }),
              single: jest.fn().mockResolvedValue({ data: inserted[0], error: null }),
              then: (resolve: any) => resolve({ data: inserted, error: null }),
            };
          }),
          update: jest.fn().mockImplementation((payload: any) => {
            const updateBuilder: any = {
              _filters: [] as Array<{ col: string; val: any }>,
              eq: jest.fn().mockImplementation((col: string, val: any) => {
                updateBuilder._filters.push({ col, val });
                currentTable.forEach((item: any, idx: number) => {
                  const match = updateBuilder._filters.every((f: any) => item[f.col] === f.val);
                  if (match) {
                    currentTable[idx] = { ...item, ...payload, updated_at: new Date().toISOString() };
                  }
                });
                return updateBuilder;
              }),
              select: jest.fn().mockImplementation(() => ({
                single: jest.fn().mockImplementation(() => {
                  const item = currentTable.find((i: any) => updateBuilder._filters.every((f: any) => i[f.col] === f.val));
                  return Promise.resolve({ data: item || null, error: item ? null : { message: 'Not found' } });
                }),
                then: (resolve: any) => {
                  const items = currentTable.filter((i: any) => updateBuilder._filters.every((f: any) => i[f.col] === f.val));
                  return resolve({ data: items, error: null });
                },
              })),
              then: (resolve: any) => {
                const items = currentTable.filter((i: any) => updateBuilder._filters.every((f: any) => i[f.col] === f.val));
                return resolve({ data: items, error: null });
              },
            };
            return updateBuilder;
          }),
          delete: jest.fn().mockImplementation(() => {
            const deleteBuilder: any = {
              _filters: [] as Array<{ col: string; val: any }>,
              eq: jest.fn().mockImplementation((col: string, val: any) => {
                deleteBuilder._filters.push({ col, val });
                const remaining = currentTable.filter((item: any) => !deleteBuilder._filters.every((f: any) => item[f.col] === f.val));
                currentTable.length = 0;
                currentTable.push(...remaining);
                return deleteBuilder;
              }),
              in: jest.fn().mockImplementation((col: string, vals: any[]) => {
                const remaining = currentTable.filter((item: any) => !vals.includes(item[col]));
                currentTable.length = 0;
                currentTable.push(...remaining);
                return deleteBuilder;
              }),
              then: (resolve: any) => resolve({ error: null }),
            };
            return deleteBuilder;
          }),
          upsert: jest.fn().mockImplementation((payload: any) => {
            const idx = currentTable.findIndex((item: any) => item.key === payload.key);
            if (idx !== -1) {
              currentTable[idx] = { ...currentTable[idx], ...payload, updated_at: new Date().toISOString() };
            } else {
              currentTable.push(payload);
            }
            return {
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: payload, error: null }),
              }),
            };
          }),
        };
        return builder;
      }),
      auth: {
        signUp: jest.fn().mockResolvedValue({ data: { user: { id: 'u-1', email: 'test@example.com' } }, error: null }),
        signInWithPassword: jest.fn().mockResolvedValue({ data: { session: { access_token: 'jwt-token' } }, error: null }),
        signOut: jest.fn().mockResolvedValue({ error: null }),
      },
    },
    client: {
      from: jest.fn(),
    },
  });

  beforeAll(async () => {
    const mockSupabase = createMockSupabase();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        ShopsService,
        ProductsService,
        InventoryService,
        SearchService,
        CartService,
        WishlistService,
        BargainingService,
        OrdersService,
        PaymentsService,
        DeliveryService,
        AdminService,
        AuditLogsService,
        LocationsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'RAZORPAY_KEY_SECRET') return 'test_rzp_secret_123';
              if (key === 'RAZORPAY_WEBHOOK_SECRET') return 'test_webhook_secret_123';
              return null;
            }),
          },
        },
        {
          provide: SupabaseService,
          useValue: mockSupabase,
        },
      ],
    }).compile();


    authService = module.get<AuthService>(AuthService);
    shopsService = module.get<ShopsService>(ShopsService);
    productsService = module.get<ProductsService>(ProductsService);
    inventoryService = module.get<InventoryService>(InventoryService);
    searchService = module.get<SearchService>(SearchService);
    cartService = module.get<CartService>(CartService);
    wishlistService = module.get<WishlistService>(WishlistService);
    bargainingService = module.get<BargainingService>(BargainingService);
    ordersService = module.get<OrdersService>(OrdersService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
    deliveryService = module.get<DeliveryService>(DeliveryService);
    adminService = module.get<AdminService>(AdminService);
    auditLogsService = module.get<AuditLogsService>(AuditLogsService);
  });

  it('Complete End-to-End Multi-Role Workflow: Seller -> Admin -> Consumer -> Bargain -> Checkout -> Delivery -> Audit', async () => {
    // ----------------------------------------------------
    // 1. SETUP ACTORS
    // ----------------------------------------------------
    const sellerId = 'seller-uuid-101';
    const consumerId = 'consumer-uuid-202';
    const deliveryPartnerId = 'delivery-uuid-303';
    const adminId = 'admin-uuid-404';

    db.users.push(
      { id: sellerId, full_name: 'Jaipur Silk Mart', email: 'seller@jaipur.com', role: 'SELLER', is_active: true },
      { id: consumerId, full_name: 'Priya Sharma', email: 'priya@gmail.com', phone_number: '+919876543210', role: 'CONSUMER', is_active: true },
      { id: deliveryPartnerId, full_name: 'Vikram Rider', email: 'vikram@speedy.com', role: 'DELIVERY_PARTNER', is_active: true },
      { id: adminId, full_name: 'Super Admin', email: 'admin@paridhan.com', role: 'ADMIN', is_active: true },
    );

    const addressId = 'addr-uuid-505';
    db.user_addresses.push({
      id: addressId,
      user_id: consumerId,
      address_line1: 'Flat 402, Lotus Residency, MG Road',
      city: 'Jaipur',
      state: 'Rajasthan',
      postal_code: '302001',
      latitude: 26.9124,
      longitude: 75.7873,
      is_default: true,
    });

    // ----------------------------------------------------
    // 2. SELLER: Create Shop & Catalog
    // ----------------------------------------------------
    const shop = await shopsService.createShop(sellerId, {
      name: 'Jaipur Heritage Silks',
      description: 'Authentic royal Rajasthani traditional clothing',
      addressLine1: 'Bapu Bazaar, Old City',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302003',
      latitude: 26.922,
      longitude: 75.8267,
      phone: '+919988776655',
    });
    expect(shop.id).toBeDefined();
    expect(shop.status).toBe('PENDING');

    // ----------------------------------------------------
    // 3. ADMIN: Verify Shop
    // ----------------------------------------------------
    const verifiedShop = await adminService.verifyShop(adminId, shop.id, 'VERIFIED');
    expect(verifiedShop.status).toBe('VERIFIED');

    // ----------------------------------------------------
    // 4. SELLER: Add Product, Variants & Stock
    // ----------------------------------------------------
    const product = await productsService.createProduct(sellerId, {
      shopId: shop.id,
      name: 'Handcrafted Bandhani Silk Kurta',
      description: 'Premium pure silk kurta with authentic Bandhani tie-dye',
      basePrice: 2000,
      isBargainingAllowed: true,
      minBargainPrice: 1500,
      variants: [
        { sku: 'BAN-KUR-RED-M', size: 'M', color: 'Red', price: 2000, stockQuantity: 15 },
        { sku: 'BAN-KUR-RED-L', size: 'L', color: 'Red', price: 2000, stockQuantity: 10 },
      ],
    });
    expect(product.id).toBeDefined();
    const variantM = db.product_variants.find((v) => v.product_id === product.id && v.size === 'M');
    expect(variantM).toBeDefined();

    // ----------------------------------------------------
    // 5. ADMIN: Moderate Product to ACTIVE
    // ----------------------------------------------------
    const moderatedProduct = await adminService.moderateProduct(adminId, product.id, 'ACTIVE', 'Quality verified');
    expect(moderatedProduct.status).toBe('ACTIVE');

    // ----------------------------------------------------
    // 6. CONSUMER: Search, Discover & Wishlist
    // ----------------------------------------------------
    await wishlistService.addItem(consumerId, product.id);
    const wishlist = await wishlistService.getWishlistItems(consumerId);
    expect(wishlist.length).toBe(1);

    // ----------------------------------------------------
    // 7. CONSUMER & SELLER: Structured Human Bargaining
    // ----------------------------------------------------
    // Buyer offers ₹1600 (Listed is ₹2000)
    const bargainSession = await bargainingService.createSession(consumerId, {
      productId: product.id,
      variantId: variantM.id,
      initialOffer: 1600,
      message: 'Looking for a festive discount!',
    });
    expect(bargainSession.status).toBe('OPEN');

    // Seller counters with ₹1800
    const counterOffer = await bargainingService.submitCounterOffer(
      bargainSession.id,
      sellerId,
      'SELLER',
      {
        amount: 1800,
        message: 'Can do ₹1800 with free gift wrap',
      },
    );
    expect(counterOffer.status).toBe('PENDING');

    // Buyer counters with ₹1700
    const buyerCounter = await bargainingService.submitCounterOffer(
      bargainSession.id,
      consumerId,
      'CONSUMER',
      {
        amount: 1700,
        message: 'Deal at ₹1700?',
      },
    );
    expect(buyerCounter.amount).toBe(1700);

    // Seller accepts ₹1700
    const acceptedSession = await bargainingService.acceptOffer(
      bargainSession.id,
      sellerId,
      'SELLER',
      { offerId: buyerCounter.id },
    );
    expect(acceptedSession.status).toBe('ACCEPTED');
    expect(acceptedSession.agreedPrice).toBe(1700);


    // ----------------------------------------------------
    // 8. CONSUMER: Add to Cart with Bargain Price & Checkout
    // ----------------------------------------------------
    await cartService.addItem(consumerId, variantM.id, 1, acceptedSession.sessionId);

    const cartSummary = await cartService.getCartSummary(consumerId);
    expect(cartSummary.items[0].unitPrice).toBe(1700);

    const checkoutResult = await ordersService.createCheckoutOrder(consumerId, {
      addressId: addressId,
      paymentMethod: 'ONLINE_RAZORPAY',
      deliveryNotes: 'Please ring bell',
    });
    const order = checkoutResult.order;
    expect(order.id).toBeDefined();
    expect(order.total_amount).toBe(1700);
    expect(order.status).toBe('PENDING_PAYMENT');

    // Payment confirmation
    const rzpOrderId = 'order_rzp_mock_123';
    const rzpPaymentId = 'pay_rzp_mock_456';
    const rzpSecret = 'test_rzp_secret_123';
    const validSignature = crypto
      .createHmac('sha256', rzpSecret)
      .update(`${rzpOrderId}|${rzpPaymentId}`)
      .digest('hex');

    db.payments.push({
      id: 'pay-e2e-1',
      order_id: order.id,
      payment_method: 'ONLINE_RAZORPAY',
      razorpay_order_id: rzpOrderId,
      amount: 1700,
      status: 'PENDING',
    });

    await paymentsService.verifyRazorpayPayment(consumerId, {
      orderId: order.id,
      razorpayOrderId: rzpOrderId,
      razorpayPaymentId: rzpPaymentId,
      razorpaySignature: validSignature,
    });

    const confirmedOrder = await ordersService.getOrderById(order.id, consumerId, 'CONSUMER');
    expect(confirmedOrder.status).toBe('CONFIRMED');

    // ----------------------------------------------------
    // 9. SELLER: Prepare Order & Ready for Pickup
    // ----------------------------------------------------
    await ordersService.updateOrderStatus(
      order.id,
      'PREPARING',
      sellerId,
      'SELLER',
      'Item packed in festive box',
    );
    const readyOrder = await ordersService.updateOrderStatus(
      order.id,
      'READY_FOR_PICKUP',
      sellerId,
      'SELLER',
      'Ready at shop counter',
    );
    expect(readyOrder.status).toBe('READY_FOR_PICKUP');


    // ----------------------------------------------------
    // 10. DELIVERY PARTNER: Assignment, Pickup & Handover
    // ----------------------------------------------------
    // Assign delivery
    const delivery = await deliveryService.assignDeliveryPartner(
      {
        orderId: order.id,
        deliveryPartnerId: deliveryPartnerId,
      },
      sellerId,
      'SELLER',
    );
    expect(delivery.status).toBe('ASSIGNED');
    expect(delivery.pickup_otp).toBeDefined();

    // Partner accepts
    await deliveryService.acceptDelivery(delivery.id, deliveryPartnerId);

    // Verify privacy pre-pickup: customer navigation URL is withheld
    const prePickupView = await deliveryService.getDeliveryById(
      delivery.id,
      deliveryPartnerId,
      'DELIVERY_PARTNER',
    );
    expect(prePickupView.customerNavigationUrl).toBeUndefined();

    // Partner verifies shop pickup OTP
    const pickupOtp = delivery.pickup_otp!;
    const pickedUpDelivery = await deliveryService.confirmPickup(
      delivery.id,
      deliveryPartnerId,
      { pickupOtp },
    );
    expect(pickedUpDelivery.status).toBe('PICKED_UP');

    // Get the generated customer delivery OTP from DB
    const rawDeliveryAfterPickup = db.deliveries.find((d) => d.id === delivery.id);
    expect(rawDeliveryAfterPickup.delivery_otp).toBeDefined();

    // Partner starts transit
    await deliveryService.startDelivery(delivery.id, deliveryPartnerId);

    // Verify privacy in-transit: customer navigation link unlocked
    const inTransitView = await deliveryService.getDeliveryById(
      delivery.id,
      deliveryPartnerId,
      'DELIVERY_PARTNER',
    );
    expect(inTransitView.customerNavigationUrl).toContain('https://www.google.com/maps/dir/?api=1');

    // Customer gives delivery OTP at doorstep
    const deliveryOtp = rawDeliveryAfterPickup.delivery_otp;
    const completedDelivery = await deliveryService.confirmDelivery(
      delivery.id,
      deliveryPartnerId,
      { deliveryOtp },
    );
    expect(completedDelivery.status).toBe('DELIVERED');

    // Verify parent order is DELIVERED
    const finalOrder = await ordersService.getOrderById(order.id, consumerId);
    expect(finalOrder.status).toBe('DELIVERED');


    // ----------------------------------------------------
    // 11. CONSUMER: Submit Verified Review
    // ----------------------------------------------------
    db.reviews.push({
      id: 'rev-e2e-1',
      user_id: consumerId,
      product_id: product.id,
      shop_id: shop.id,
      order_id: order.id,
      rating: 5,
      comment: 'Exceptional Bandhani silk quality and lightning fast delivery!',
      is_verified_purchase: true,
      created_at: new Date().toISOString(),
    });

    // ----------------------------------------------------
    // 12. ADMIN: Verify Dashboard Metrics & Audit Trail
    // ----------------------------------------------------
    const adminMetrics = await adminService.getDashboardMetrics();
    expect(adminMetrics.totalShops).toBeGreaterThanOrEqual(1);
    expect(adminMetrics.totalOrders).toBeGreaterThanOrEqual(1);
    expect(adminMetrics.grossMerchandiseValue).toBeGreaterThanOrEqual(1700);

    const auditLogs = await auditLogsService.getLogs();
    expect(auditLogs.length).toBeGreaterThanOrEqual(2);
    expect(auditLogs.some((l) => l.action === 'VERIFY_SHOP')).toBe(true);
    expect(auditLogs.some((l) => l.action === 'MODERATE_PRODUCT')).toBe(true);
  });
});
