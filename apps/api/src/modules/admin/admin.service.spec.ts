import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotFoundException } from '@nestjs/common';

describe('AdminService', () => {
  let service: AdminService;
  let auditLogsService: AuditLogsService;

  const mockUsers: any[] = [
    { id: 'user-1', full_name: 'John Buyer', email: 'john@example.com', role: 'CONSUMER', is_active: true, created_at: new Date().toISOString() },
    { id: 'seller-1', full_name: 'Suresh Textiles', email: 'suresh@example.com', role: 'SELLER', is_active: true, created_at: new Date().toISOString() },
    { id: 'partner-1', full_name: 'Ramesh Rider', email: 'ramesh@example.com', role: 'DELIVERY_PARTNER', is_active: true, created_at: new Date().toISOString() },
    { id: 'admin-1', full_name: 'Admin User', email: 'admin@example.com', role: 'ADMIN', is_active: true, created_at: new Date().toISOString() },
  ];

  const mockShops: any[] = [
    { id: 'shop-1', name: 'Suresh Textiles', seller_id: 'seller-1', status: 'PENDING', created_at: new Date().toISOString() },
  ];

  const mockProducts: any[] = [
    { id: 'prod-1', shop_id: 'shop-1', title: 'Silk Saree', status: 'PENDING_REVIEW', created_at: new Date().toISOString() },
  ];

  const mockOrders: any[] = [
    { id: 'order-1', user_id: 'user-1', shop_id: 'shop-1', status: 'CONFIRMED', total_amount: 2500, created_at: new Date().toISOString() },
  ];

  const mockDeliveries: any[] = [
    { id: 'del-1', order_id: 'order-1', status: 'ASSIGNED', created_at: new Date().toISOString() },
  ];

  const mockPayments: any[] = [
    { id: 'pay-1', order_id: 'order-1', amount: 2500, status: 'PAID', created_at: new Date().toISOString() },
  ];


  const mockComplaints: any[] = [
    { id: 'comp-1', reporter_id: 'user-1', subject: 'Late delivery', status: 'PENDING', description: 'Item took 3 days', created_at: new Date().toISOString() },
  ];

  const mockReviews: any[] = [
    { id: 'rev-1', user_id: 'user-1', shop_id: 'shop-1', rating: 1, comment: 'Spam review', created_at: new Date().toISOString() },
  ];

  const mockSettings: any[] = [
    { key: 'platform_fee_percent', value: 5, description: 'Platform fee percentage' },
  ];

  const mockAuditLogs: any[] = [];

  const mockSupabaseClient = {
    from: jest.fn().mockImplementation((table: string) => {
      let currentData: any[] = [];
      if (table === 'users') currentData = mockUsers;
      if (table === 'shops') currentData = mockShops;
      if (table === 'products') currentData = mockProducts;
      if (table === 'orders') currentData = mockOrders;
      if (table === 'deliveries') currentData = mockDeliveries;
      if (table === 'payments') currentData = mockPayments;
      if (table === 'complaints') currentData = mockComplaints;
      if (table === 'reviews') currentData = mockReviews;
      if (table === 'platform_settings') currentData = mockSettings;
      if (table === 'audit_logs') currentData = mockAuditLogs;

      const builder: any = {
        _filtered: [...currentData],
        _isCount: false,
        select: jest.fn().mockImplementation((cols?: string, options?: any) => {
          if (options?.head && options?.count === 'exact') {
            builder._isCount = true;
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
        or: jest.fn().mockImplementation(() => builder),
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
        then: (resolve: any) => {
          if (builder._isCount) {
            return resolve({ count: builder._filtered.length, data: null, error: null });
          }
          return resolve({ data: builder._filtered, error: null });
        },
        insert: jest.fn().mockImplementation((payload: any) => {
          const inserted = { id: `id-${Date.now()}`, ...payload, created_at: new Date().toISOString() };
          currentData.push(inserted);
          return Promise.resolve({ data: inserted, error: null });
        }),

        update: jest.fn().mockImplementation((payload: any) => {
          return {
            eq: jest.fn().mockImplementation((col: string, val: any) => {
              const idx = currentData.findIndex((item: any) => item[col] === val);
              if (idx !== -1) {
                currentData[idx] = { ...currentData[idx], ...payload };
                return {
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: currentData[idx], error: null }),
                  }),
                };
              }
              return {
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
                }),
              };
            }),
          };
        }),
        delete: jest.fn().mockImplementation(() => {
          return {
            eq: jest.fn().mockImplementation((col: string, val: any) => {
              const idx = currentData.findIndex((item: any) => item[col] === val);
              if (idx !== -1) {
                currentData.splice(idx, 1);
              }
              return Promise.resolve({ error: null });
            }),
          };
        }),
        upsert: jest.fn().mockImplementation((payload: any) => {
          const idx = currentData.findIndex((item: any) => item.key === payload.key);
          if (idx !== -1) {
            currentData[idx] = { ...currentData[idx], ...payload };
          } else {
            currentData.push(payload);
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        AuditLogsService,
        {
          provide: SupabaseService,
          useValue: {
            admin: mockSupabaseClient,
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    auditLogsService = module.get<AuditLogsService>(AuditLogsService);
  });

  describe('Metrics & Analytics', () => {
    it('should aggregate dashboard counts and GMV revenue', async () => {
      const metrics = await service.getDashboardMetrics();
      expect(metrics.totalUsers).toBeGreaterThanOrEqual(1);
      expect(metrics.totalShops).toBeGreaterThanOrEqual(1);
      expect(metrics.totalOrders).toBeGreaterThanOrEqual(1);
      expect(metrics.totalProducts).toBeGreaterThanOrEqual(1);
      expect(metrics.grossMerchandiseValue).toBe(2500);
    });
  });

  describe('User Management', () => {
    it('should list users with pagination and role filter', async () => {
      const result = await service.listUsers({ role: 'SELLER', page: 1, limit: 10 });
      expect(result.users.length).toBe(1);
      expect(result.users[0].role).toBe('SELLER');
    });

    it('should update user role and emit audit log', async () => {
      const updated = await service.updateUserRole('admin-1', 'user-1', 'SELLER');
      expect(updated.role).toBe('SELLER');
      expect(mockAuditLogs.some((l) => l.action === 'UPDATE_USER_ROLE')).toBe(true);
    });

    it('should suspend and reactivate user with reason and audit log', async () => {
      const suspended = await service.setUserSuspension('admin-1', 'user-1', true, 'Fraudulent activity');
      expect(suspended.is_active).toBe(false);
      expect(mockAuditLogs.some((l) => l.action === 'SUSPEND_USER')).toBe(true);

      const reactivated = await service.setUserSuspension('admin-1', 'user-1', false);
      expect(reactivated.is_active).toBe(true);
      expect(mockAuditLogs.some((l) => l.action === 'ACTIVATE_USER')).toBe(true);
    });
  });

  describe('Shop Verification', () => {
    it('should list shops and update verification status with audit log', async () => {
      const list = await service.listShops({ status: 'PENDING' });
      expect(list.shops.length).toBeGreaterThanOrEqual(1);

      const verified = await service.verifyShop('admin-1', 'shop-1', 'VERIFIED');
      expect(verified.status).toBe('VERIFIED');
      expect(mockAuditLogs.some((l) => l.action === 'VERIFY_SHOP')).toBe(true);
    });

    it('should support suspending a shop', async () => {
      const suspended = await service.verifyShop('admin-1', 'shop-1', 'SUSPENDED', 'Policy breach');
      expect(suspended.status).toBe('SUSPENDED');
    });
  });

  describe('Product Moderation', () => {
    it('should moderate product status and record audit log', async () => {
      const moderated = await service.moderateProduct('admin-1', 'prod-1', 'ACTIVE', 'Approved fashion item');
      expect(moderated.status).toBe('ACTIVE');
      expect(mockAuditLogs.some((l) => l.action === 'MODERATE_PRODUCT')).toBe(true);
    });
  });

  describe('Privileged Order Operations', () => {
    it('should cancel order, cancel delivery, refund payment, and emit audit log', async () => {
      const cancelled = await service.privilegedCancelOrder(
        'admin-1',
        'order-1',
        'Customer chargeback investigation',
        2500,
      );
      expect(cancelled.status).toBe('CANCELLED');
      expect(mockAuditLogs.some((l) => l.action === 'PRIVILEGED_CANCEL_ORDER')).toBe(true);
    });
  });

  describe('Reviews & Complaints Moderation', () => {
    it('should delete abusive reviews and record audit log', async () => {
      const res = await service.deleteReview('admin-1', 'rev-1', 'Abusive language');
      expect(res.success).toBe(true);
      expect(mockAuditLogs.some((l) => l.action === 'DELETE_REVIEW')).toBe(true);
    });

    it('should resolve customer complaints with notes and record audit log', async () => {
      const resolved = await service.resolveComplaint(
        'admin-1',
        'comp-1',
        'RESOLVED',
        'Issued 20% discount coupon to consumer',
      );
      expect(resolved.status).toBe('RESOLVED');
      expect(mockAuditLogs.some((l) => l.action === 'RESOLVE_COMPLAINT')).toBe(true);
    });
  });

  describe('Platform Settings', () => {
    it('should get and update platform settings with audit log', async () => {
      const settings = await service.getSettings();
      expect(settings.length).toBeGreaterThanOrEqual(1);

      const updated = await service.updateSetting('admin-1', 'platform_fee_percent', 7.5, 'Updated commission rate');
      expect(updated.key).toBe('platform_fee_percent');
      expect(mockAuditLogs.some((l) => l.action === 'UPDATE_PLATFORM_SETTING')).toBe(true);
    });
  });
});
