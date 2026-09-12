import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  ShopStatus,
  ProductStatus,
  UserRole,
  ComplaintStatus,
  OrderStatus,
  Json,
} from '@paridhan/types';

export interface UserListFilters {
  role?: UserRole;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ShopListFilters {
  status?: ShopStatus;
  page?: number;
  limit?: number;
}

export interface ProductListFilters {
  status?: ProductStatus;
  page?: number;
  limit?: number;
}

export interface ComplaintListFilters {
  status?: ComplaintStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  // --- Metrics & Analytics ---
  async getDashboardMetrics() {
    const [
      { count: usersCount },
      { count: shopsCount },
      { count: ordersCount },
      { count: productsCount },
      { count: pendingComplaintsCount },
      { count: activeDeliveriesCount },
      { data: paymentsData },
    ] = await Promise.all([
      this.supabase.admin.from('users').select('*', { count: 'exact', head: true }),
      this.supabase.admin.from('shops').select('*', { count: 'exact', head: true }),
      this.supabase.admin.from('orders').select('*', { count: 'exact', head: true }),
      this.supabase.admin.from('products').select('*', { count: 'exact', head: true }),
      this.supabase.admin
        .from('complaints')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING'),
      this.supabase.admin
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .in('status', ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY']),
      this.supabase.admin
        .from('payments')
        .select('amount, status')
        .eq('status', 'PAID'),
    ]);


    const totalRevenue = (paymentsData ?? []).reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0,
    );

    return {
      totalUsers: usersCount || 0,
      totalShops: shopsCount || 0,
      totalOrders: ordersCount || 0,
      totalProducts: productsCount || 0,
      pendingComplaints: pendingComplaintsCount || 0,
      activeDeliveries: activeDeliveriesCount || 0,
      grossMerchandiseValue: totalRevenue,
    };
  }

  // --- User Administration ---
  async listUsers(filters?: UserListFilters) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    let query = this.supabase.admin
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }
    if (filters?.search) {
      query = query.or(
        `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone_number.ilike.%${filters.search}%`,
      );
    }

    query = query.range(offset, offset + limit - 1);
    const { data, count, error } = await query;
    if (error) throw error;

    return {
      users: data ?? [],
      total: count || 0,
      page,
      limit,
    };
  }

  async getUserById(id: string) {
    const { data: user, error } = await this.supabase.admin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !user) throw new NotFoundException('User not found');

    const [{ data: shops }, { data: addresses }] = await Promise.all([
      this.supabase.admin.from('shops').select('*').eq('seller_id', id),
      this.supabase.admin.from('user_addresses').select('*').eq('user_id', id),
    ]);

    return {
      ...user,
      shops: shops ?? [],
      addresses: addresses ?? [],
    };
  }

  async updateUserRole(adminId: string, targetUserId: string, newRole: UserRole) {
    const { data: user, error } = await this.supabase.admin
      .from('users')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', targetUserId)
      .select()
      .single();

    if (error || !user) throw new NotFoundException('User not found');

    await this.auditLogs.logAction(
      'UPDATE_USER_ROLE',
      'users',
      adminId,
      targetUserId,
      { newRole } as unknown as Json,
    );

    return user;
  }

  async setUserSuspension(
    adminId: string,
    targetUserId: string,
    isSuspended: boolean,
    reason?: string | null,
  ) {
    const { data: user, error } = await this.supabase.admin
      .from('users')
      .update({
        is_active: !isSuspended,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId)
      .select()
      .single();

    if (error || !user) throw new NotFoundException('User not found');

    await this.auditLogs.logAction(
      isSuspended ? 'SUSPEND_USER' : 'ACTIVATE_USER',
      'users',
      adminId,
      targetUserId,
      { isSuspended, reason } as unknown as Json,
    );

    return user;
  }

  // --- Shop Verification ---
  async listShops(filters?: ShopListFilters) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    let query = this.supabase.admin
      .from('shops')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    query = query.range(offset, offset + limit - 1);
    const { data, count, error } = await query;
    if (error) throw error;

    return {
      shops: data ?? [],
      total: count || 0,
      page,
      limit,
    };
  }

  async verifyShop(
    adminId: string,
    shopId: string,
    status: ShopStatus,
    rejectionReason?: string | null,
  ) {
    const { data, error } = await this.supabase.admin
      .from('shops')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shopId)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Shop not found');

    await this.auditLogs.logAction(
      'VERIFY_SHOP',
      'shops',
      adminId,
      shopId,
      { status, rejectionReason } as unknown as Json,
    );

    return data;
  }

  // --- Product Moderation ---
  async listProducts(filters?: ProductListFilters) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    let query = this.supabase.admin
      .from('products')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    query = query.range(offset, offset + limit - 1);
    const { data, count, error } = await query;
    if (error) throw error;

    return {
      products: data ?? [],
      total: count || 0,
      page,
      limit,
    };
  }

  async moderateProduct(
    adminId: string,
    productId: string,
    status: ProductStatus,
    moderationNotes?: string | null,
  ) {
    const { data, error } = await this.supabase.admin
      .from('products')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Product not found');

    await this.auditLogs.logAction(
      'MODERATE_PRODUCT',
      'products',
      adminId,
      productId,
      { status, moderationNotes } as unknown as Json,
    );

    return data;
  }

  // --- Orders Administration & Privileged Actions ---
  async listOrders(page = 1, limit = 20, status?: OrderStatus) {
    const offset = (page - 1) * limit;

    let query = this.supabase.admin
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    query = query.range(offset, offset + limit - 1);
    const { data, count, error } = await query;
    if (error) throw error;

    return {
      orders: data ?? [],
      total: count || 0,
      page,
      limit,
    };
  }

  async privilegedCancelOrder(
    adminId: string,
    orderId: string,
    reason: string,
    refundAmount?: number | null,
  ) {
    const { data: order, error } = await this.supabase.admin
      .from('orders')
      .update({
        status: 'CANCELLED',
        cancellation_reason: `[ADMIN CANCEL] ${reason}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error || !order) throw new NotFoundException('Order not found');

    // Cancel associated delivery if any
    await this.supabase.admin
      .from('deliveries')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId);


    // If refund is applicable, update payment record
    if (refundAmount && refundAmount > 0) {
      await this.supabase.admin
        .from('payments')
        .update({
          status: 'REFUNDED',
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', orderId);
    }

    await this.auditLogs.logAction(
      'PRIVILEGED_CANCEL_ORDER',
      'orders',
      adminId,
      orderId,
      { reason, refundAmount } as unknown as Json,
    );

    return order;
  }

  // --- Reviews Moderation ---
  async listReviews(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const { data, count, error } = await this.supabase.admin
      .from('reviews')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return {
      reviews: data ?? [],
      total: count || 0,
      page,
      limit,
    };
  }

  async deleteReview(adminId: string, reviewId: string, reason?: string) {
    const { error } = await this.supabase.admin
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) throw error;

    await this.auditLogs.logAction(
      'DELETE_REVIEW',
      'reviews',
      adminId,
      reviewId,
      { reason } as unknown as Json,
    );

    return { success: true, message: 'Review deleted successfully' };
  }

  // --- Complaints / Reports Management ---
  async listComplaints(filters?: ComplaintListFilters) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    let query = this.supabase.admin
      .from('complaints')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    query = query.range(offset, offset + limit - 1);
    const { data, count, error } = await query;
    if (error) throw error;

    return {
      complaints: data ?? [],
      total: count || 0,
      page,
      limit,
    };
  }

  async getComplaintById(complaintId: string) {
    const { data, error } = await this.supabase.admin
      .from('complaints')
      .select('*')
      .eq('id', complaintId)
      .single();

    if (error || !data) throw new NotFoundException('Complaint not found');
    return data;
  }

  async resolveComplaint(
    adminId: string,
    complaintId: string,
    status: ComplaintStatus,
    resolutionNotes: string,
  ) {
    const { data, error } = await this.supabase.admin
      .from('complaints')
      .update({
        status,
        resolution_notes: resolutionNotes,
        resolved_by: adminId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', complaintId)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Complaint not found');

    await this.auditLogs.logAction(
      'RESOLVE_COMPLAINT',
      'complaints',
      adminId,
      complaintId,
      { status, resolutionNotes } as unknown as Json,
    );

    return data;
  }

  // --- Platform Settings ---
  async getSettings() {
    const { data, error } = await this.supabase.admin
      .from('platform_settings')
      .select('*');

    if (error) throw error;
    return data ?? [];
  }

  async updateSetting(
    adminId: string,
    key: string,
    value: Json,
    description?: string | null,
  ) {
    const updatePayload: Record<string, unknown> = {
      value,
      updated_by: adminId,
      updated_at: new Date().toISOString(),
    };
    if (description !== undefined) {
      updatePayload.description = description;
    }

    const { data, error } = await this.supabase.admin
      .from('platform_settings')
      .upsert({
        key,
        value,
        description: description ?? null,
        updated_by: adminId,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await this.auditLogs.logAction(
      'UPDATE_PLATFORM_SETTING',
      'platform_settings',
      adminId,
      key,
      { key, value } as unknown as Json,
    );

    return data;
  }
}

