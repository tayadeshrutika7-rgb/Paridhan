import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryService } from './delivery.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('DeliveryService & Logistics Pipeline (Phase 8)', () => {
  let service: DeliveryService;

  let mockDeliveries: Record<string, any>;
  let mockOrders: Record<string, any>;
  let mockUsers: Record<string, any>;
  let mockHistory: any[];

  beforeEach(async () => {
    mockDeliveries = {};
    mockHistory = [];

    mockUsers = {
      'partner-karan': {
        id: 'partner-karan',
        role: 'DELIVERY_PARTNER',
        is_active: true,
        full_name: 'Karan Sharma',
      },
      'partner-unassigned': {
        id: 'partner-unassigned',
        role: 'DELIVERY_PARTNER',
        is_active: true,
        full_name: 'Rahul Verma',
      },
      'seller-rajesh': {
        id: 'seller-rajesh',
        role: 'SELLER',
        is_active: true,
      },
    };

    mockOrders = {
      'order-101': {
        id: 'order-101',
        user_id: 'user-consumer',
        shop_id: 'shop-jaipur-1',
        address_id: 'addr-consumer',
        status: 'READY_FOR_PICKUP',
        payment_method: 'CASH_ON_DELIVERY',
        payment_status: 'PENDING',
        shops: {
          id: 'shop-jaipur-1',
          seller_id: 'seller-rajesh',
          name: 'Pink City Handlooms',
          city: 'Jaipur',
          latitude: 26.9124,
          longitude: 75.7873,
        },
        user_addresses: {
          id: 'addr-consumer',
          recipient_name: 'Aarav Sharma',
          phone: '+919876543210',
          address_line1: 'Flat 402, Royal Palms, C-Scheme',
          city: 'Jaipur',
          state: 'Rajasthan',
          pincode: '302001',
          latitude: 26.9050,
          longitude: 75.7980,
        },
      },
    };

    const mockSupabase = {
      admin: {
        from: jest.fn((table: string) => {
          if (table === 'orders') {
            return {
              select: () => ({
                eq: (col: string, val: string) => ({
                  maybeSingle: async () => ({
                    data: mockOrders[val] ? { ...mockOrders[val] } : null,
                    error: null,
                  }),
                }),
              }),
              update: (data: any) => ({
                eq: (col: string, val: string) => {
                  if (mockOrders[val]) {
                    mockOrders[val] = { ...mockOrders[val], ...data };
                  }
                  return { data: mockOrders[val], error: null };
                },
              }),
            };
          }

          if (table === 'users') {
            return {
              select: () => ({
                eq: (col: string, val: string) => ({
                  maybeSingle: async () => ({
                    data: mockUsers[val] || null,
                    error: null,
                  }),
                }),
              }),
            };
          }

          if (table === 'deliveries') {
            return {
              select: () => ({
                eq: (col: string, val: string) => ({
                  maybeSingle: async () => {
                    const del =
                      col === 'id'
                        ? mockDeliveries[val]
                        : Object.values(mockDeliveries).find((d) => d[col] === val);

                    if (!del) return { data: null, error: null };
                    const order = mockOrders[del.order_id];
                    return {
                      data: {
                        ...del,
                        orders: order ? { ...order } : null,
                      },
                      error: null,
                    };
                  },
                  in: (col2: string, vals: string[]) => ({
                    order: () => ({
                      data: Object.values(mockDeliveries)
                        .filter((d) => d[col] === val && vals.includes(d[col2]))
                        .map((d) => ({
                          ...d,
                          orders: mockOrders[d.order_id] ? { ...mockOrders[d.order_id] } : null,
                        })),
                      error: null,
                    }),
                  }),
                }),
              }),
              insert: (data: any) => {
                const newDel = {
                  id: `del-${Date.now()}`,
                  ...data,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                mockDeliveries[newDel.id] = newDel;
                return {
                  select: () => ({
                    single: async () => ({ data: newDel, error: null }),
                  }),
                };
              },
              update: (data: any) => ({
                eq: (col: string, val: string) => {
                  if (mockDeliveries[val]) {
                    mockDeliveries[val] = { ...mockDeliveries[val], ...data };
                  }
                  return {
                    select: () => ({
                      single: async () => ({ data: mockDeliveries[val], error: null }),
                    }),
                  };
                },
              }),
            };
          }

          if (table === 'delivery_status_history') {
            return {
              insert: async (data: any) => {
                mockHistory.push(data);
                return { error: null };
              },
            };
          }

          if (table === 'order_status_history') {
            return {
              insert: async () => ({ error: null }),
            };
          }

          if (table === 'shops') {
            return {
              select: () => ({
                eq: (col: string, val: string) => ({
                  maybeSingle: async () => {
                    const shop = Object.values(mockOrders)
                      .map((o) => o.shops)
                      .find((s) => s.id === val);
                    return { data: shop || null, error: null };
                  },
                }),
              }),
            };
          }

          if (table === 'user_addresses') {
            return {
              select: () => ({
                eq: (col: string, val: string) => ({
                  maybeSingle: async () => {
                    const addr = Object.values(mockOrders)
                      .map((o) => o.user_addresses)
                      .find((a) => a && a.id === val);
                    return { data: addr || null, error: null };
                  },
                }),
              }),
            };
          }

          if (table === 'payments') {
            return {
              update: () => ({
                eq: () => ({ error: null }),
              }),
            };
          }

          return {};
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();

    service = module.get<DeliveryService>(DeliveryService);
  });

  describe('Assignment & Initialization', () => {
    it('CRITICAL TEST: assigns delivery partner with generated 4-digit pickup and delivery OTPs', async () => {
      const delivery = await service.assignDeliveryPartner(
        {
          orderId: 'order-101',
          deliveryPartnerId: 'partner-karan',
        },
        'seller-rajesh',
        'SELLER',
      );

      expect(delivery).toBeDefined();
      expect(delivery.status).toBe('ASSIGNED');
      expect(delivery.delivery_partner_id).toBe('partner-karan');
      expect(delivery.pickup_otp).toMatch(/^\d{4}$/);
      expect(delivery.delivery_otp).toMatch(/^\d{4}$/);
    });

    it('rejects assignment for order not ready', async () => {
      mockOrders['order-101'].status = 'DELIVERED';

      await expect(
        service.assignDeliveryPartner(
          {
            orderId: 'order-101',
            deliveryPartnerId: 'partner-karan',
          },
          'seller-rajesh',
          'SELLER',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Complete Delivery Lifecycle & OTP Verification', () => {
    let activeDeliveryId: string;
    let pickupOtp: string;
    let deliveryOtp: string;

    beforeEach(async () => {
      const delivery = await service.assignDeliveryPartner(
        {
          orderId: 'order-101',
          deliveryPartnerId: 'partner-karan',
        },
        'seller-rajesh',
        'SELLER',
      );
      activeDeliveryId = delivery.id;
      pickupOtp = delivery.pickup_otp;
      deliveryOtp = delivery.delivery_otp;
    });

    it('CRITICAL TEST: executes full delivery flow (ASSIGNED -> ACCEPTED -> PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED)', async () => {
      // 1. Partner accepts assignment
      const accepted = await service.acceptDelivery(activeDeliveryId, 'partner-karan');
      expect(accepted.status).toBe('ACCEPTED');

      // 2. Partner confirms physical pickup with Pickup OTP
      const pickedUp = await service.confirmPickup(activeDeliveryId, 'partner-karan', {
        pickupOtp,
        notes: 'Package collected in good condition',
      });
      expect(pickedUp.status).toBe('PICKED_UP');
      expect(pickedUp.picked_up_at).toBeDefined();
      expect(mockOrders['order-101'].status).toBe('PICKED_UP'); // Order status synchronized

      // 3. Partner starts transit (Out for Delivery)
      const transit = await service.startDelivery(activeDeliveryId, 'partner-karan');
      expect(transit.status).toBe('OUT_FOR_DELIVERY');
      expect(mockOrders['order-101'].status).toBe('OUT_FOR_DELIVERY'); // Order status synchronized

      // 4. Partner confirms customer handover with Delivery OTP
      const delivered = await service.confirmDelivery(activeDeliveryId, 'partner-karan', {
        deliveryOtp,
        notes: 'Delivered to customer at door',
      });
      expect(delivered.status).toBe('DELIVERED');
      expect(delivered.delivered_at).toBeDefined();
      expect(mockOrders['order-101'].status).toBe('DELIVERED'); // Order status synchronized
      expect(mockOrders['order-101'].payment_status).toBe('PAID'); // COD payment captured
    });

    it('CRITICAL TEST: rejects pickup confirmation when invalid pickup OTP is supplied', async () => {
      await service.acceptDelivery(activeDeliveryId, 'partner-karan');

      await expect(
        service.confirmPickup(activeDeliveryId, 'partner-karan', {
          pickupOtp: '9999', // Wrong OTP
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockDeliveries[activeDeliveryId].status).toBe('ACCEPTED');
    });

    it('CRITICAL TEST: rejects delivery confirmation when invalid delivery OTP is supplied', async () => {
      await service.acceptDelivery(activeDeliveryId, 'partner-karan');
      await service.confirmPickup(activeDeliveryId, 'partner-karan', { pickupOtp });
      await service.startDelivery(activeDeliveryId, 'partner-karan');

      await expect(
        service.confirmDelivery(activeDeliveryId, 'partner-karan', {
          deliveryOtp: '0000', // Wrong OTP
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockDeliveries[activeDeliveryId].status).toBe('OUT_FOR_DELIVERY');
    });

    it('CRITICAL TEST: reports delivery failure and synchronizes order status to FAILED', async () => {
      await service.acceptDelivery(activeDeliveryId, 'partner-karan');
      await service.confirmPickup(activeDeliveryId, 'partner-karan', { pickupOtp });
      await service.startDelivery(activeDeliveryId, 'partner-karan');

      const failed = await service.reportDeliveryFailure(activeDeliveryId, 'partner-karan', {
        reason: 'Customer phone switched off and door locked after 3 attempts',
      });

      expect(failed.status).toBe('FAILED');
      expect(mockOrders['order-101'].status).toBe('FAILED');
    });
  });

  describe('Customer Privacy Protection & Google Maps Links', () => {
    let activeDeliveryId: string;
    let pickupOtp: string;

    beforeEach(async () => {
      const delivery = await service.assignDeliveryPartner(
        {
          orderId: 'order-101',
          deliveryPartnerId: 'partner-karan',
        },
        'seller-rajesh',
        'SELLER',
      );
      activeDeliveryId = delivery.id;
      pickupOtp = delivery.pickup_otp;
    });

    it('CRITICAL TEST: masks customer address and phone in ASSIGNED/ACCEPTED status prior to pickup', async () => {
      const details = await service.getDeliveryById(activeDeliveryId, 'partner-karan', 'DELIVERY_PARTNER');

      // Shop navigation URL must be available for pickup
      expect(details.shopNavigationUrl).toContain('https://www.google.com/maps/dir/?api=1&destination=26.9124,75.7873');

      // Customer street address & phone MUST be masked
      const addr = details.orders.user_addresses;
      expect(addr.recipient_name).toContain('Masked until pickup');
      expect(addr.address_line1).toContain('unlocked upon shop pickup');
      expect(addr.phone).toContain('******3210'); // Masked phone
      expect(details.customerNavigationUrl).toBeUndefined(); // Navigation hidden before pickup
    });

    it('CRITICAL TEST: reveals full customer address, phone, and navigation link once PICKED_UP', async () => {
      await service.acceptDelivery(activeDeliveryId, 'partner-karan');
      await service.confirmPickup(activeDeliveryId, 'partner-karan', { pickupOtp });

      const details = await service.getDeliveryById(activeDeliveryId, 'partner-karan', 'DELIVERY_PARTNER');

      // Full address unlocked
      const addr = details.orders.user_addresses;
      expect(addr.address_line1).toBe('Flat 402, Royal Palms, C-Scheme');
      expect(addr.phone).toBe('+919876543210'); // Unmasked
      expect(details.customerNavigationUrl).toContain('destination=26.905,75.798');
    });

    it('CRITICAL TEST: rejects unauthorized delivery partner from accessing another partner delivery', async () => {
      await expect(
        service.getDeliveryById(activeDeliveryId, 'partner-unassigned', 'DELIVERY_PARTNER'),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.acceptDelivery(activeDeliveryId, 'partner-unassigned'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Invalid Delivery Transitions', () => {
    let activeDeliveryId: string;

    beforeEach(async () => {
      const delivery = await service.assignDeliveryPartner(
        {
          orderId: 'order-101',
          deliveryPartnerId: 'partner-karan',
        },
        'seller-rajesh',
        'SELLER',
      );
      activeDeliveryId = delivery.id;
    });

    it('CRITICAL TEST: rejects invalid status jump from ASSIGNED directly to DELIVERED', async () => {
      await expect(
        service.updateDeliveryStatus(
          activeDeliveryId,
          'DELIVERED',
          'partner-karan',
          'DELIVERY_PARTNER',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('CRITICAL TEST: rejects transitioning from terminal DELIVERED status', async () => {
      mockDeliveries[activeDeliveryId].status = 'DELIVERED';

      await expect(
        service.updateDeliveryStatus(
          activeDeliveryId,
          'ACCEPTED',
          'partner-karan',
          'DELIVERY_PARTNER',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
