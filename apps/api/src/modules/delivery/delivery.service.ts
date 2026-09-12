import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { DeliveryStatus, OrderStatus, UserRole, PaymentStatus } from '@paridhan/types';
import {
  DeliveryAssignDto,
  DeliveryConfirmPickupDto,
  DeliveryConfirmDeliveryDto,
  DeliveryFailureReportDto,
} from '@paridhan/validation';

const VALID_DELIVERY_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  ASSIGNED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['OUT_FOR_DELIVERY', 'FAILED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  FAILED: [],
  CANCELLED: [],
};

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Helper: Generate Google Maps Navigation URL
   */
  private generateGoogleMapsUrl(lat?: number | null, lng?: number | null, fallbackAddress?: string) {
    if (lat != null && lng != null) {
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    if (fallbackAddress) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fallbackAddress)}`;
    }
    return undefined;
  }

  /**
   * Helper: Mask phone number for customer privacy (e.g., +91 9876543210 -> +91 ******3210)
   */
  private maskPhone(phone?: string | null): string {
    if (!phone) return 'N/A';
    if (phone.length <= 4) return '****';
    return phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4);
  }

  /**
   * Helper: Apply customer privacy masking based on delivery status
   */
  private sanitizeDeliveryPayload(delivery: any, role: UserRole) {
    if (role === 'ADMIN') {
      return delivery;
    }

    const order = delivery.orders;
    const address = order?.user_addresses;
    const shop = order?.shops;

    // Navigation URLs
    const shopNavigationUrl = this.generateGoogleMapsUrl(
      shop?.latitude,
      shop?.longitude,
      shop ? `${shop.name}, ${shop.city}` : undefined,
    );

    let customerNavigationUrl: string | undefined;
    let sanitizedAddress = address;

    if (role === 'DELIVERY_PARTNER') {
      const isPostPickup = ['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(delivery.status);

      if (address) {
        if (!isPostPickup) {
          // Strict Privacy Rule: Before pickup (ASSIGNED / ACCEPTED), hide street address & mask phone
          sanitizedAddress = {
            id: address.id,
            recipient_name: address.recipient_name
              ? `${address.recipient_name.split(' ')[0]} (Masked until pickup)`
              : 'Customer',
            phone: this.maskPhone(address.phone),
            address_line1: '[Full address unlocked upon shop pickup]',
            address_line2: null,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            latitude: null,
            longitude: null,
          };
          customerNavigationUrl = undefined;
        } else if (delivery.status === 'DELIVERED') {
          // Mask phone after delivery for data privacy retention
          sanitizedAddress = {
            ...address,
            phone: this.maskPhone(address.phone),
          };
          customerNavigationUrl = this.generateGoogleMapsUrl(
            address.latitude,
            address.longitude,
            `${address.address_line1}, ${address.city}`,
          );
        } else {
          // During transit (PICKED_UP / OUT_FOR_DELIVERY): Full details revealed
          customerNavigationUrl = this.generateGoogleMapsUrl(
            address.latitude,
            address.longitude,
            `${address.address_line1}, ${address.city}`,
          );
        }
      }

      // Hide delivery OTP from delivery partner (partner must collect it from customer)
      const sanitizedDelivery = { ...delivery };
      delete sanitizedDelivery.delivery_otp;
      delete sanitizedDelivery.pickup_otp;

      return {
        ...sanitizedDelivery,
        shopNavigationUrl,
        customerNavigationUrl,
        orders: order
          ? {
              ...order,
              user_addresses: sanitizedAddress,
            }
          : undefined,
      };
    }

    return {
      ...delivery,
      shopNavigationUrl,
    };
  }

  /**
   * Assign a delivery partner to an order
   */
  async assignDeliveryPartner(dto: DeliveryAssignDto, assignedBy: string, role: UserRole) {
    const { orderId, deliveryPartnerId } = dto;

    // 1. Verify order
    const { data: order, error: orderErr } = await this.supabase.admin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      throw new NotFoundException('Order not found');
    }

    if (!['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(order.status)) {
      throw new BadRequestException(
        `Cannot assign delivery for order in "${order.status}" status.`,
      );
    }

    // Role check: Admin or Shop owner
    if (role === 'SELLER') {
      const { data: shop } = await this.supabase.admin
        .from('shops')
        .select('seller_id')
        .eq('id', order.shop_id)
        .maybeSingle();

      if (!shop || shop.seller_id !== assignedBy) {
        throw new ForbiddenException('You can only assign deliveries for your own shop orders.');
      }
    }

    // 2. Verify delivery partner
    const { data: partner, error: partErr } = await this.supabase.admin
      .from('users')
      .select('id, role, is_active')
      .eq('id', deliveryPartnerId)
      .maybeSingle();

    if (partErr || !partner || partner.role !== 'DELIVERY_PARTNER' || !partner.is_active) {
      throw new BadRequestException('Invalid or inactive delivery partner selected.');
    }

    // 3. Generate secure 4-digit OTPs
    const pickupOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // 4. Create or update delivery assignment
    const { data: existingDelivery } = await this.supabase.admin
      .from('deliveries')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    let deliveryRecord;

    if (existingDelivery) {
      const { data, error } = await this.supabase.admin
        .from('deliveries')
        .update({
          delivery_partner_id: deliveryPartnerId,
          status: 'ASSIGNED' as DeliveryStatus,
          pickup_otp: pickupOtp,
          delivery_otp: deliveryOtp,
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingDelivery.id)
        .select()
        .single();

      if (error) throw error;
      deliveryRecord = data;
    } else {
      const { data, error } = await this.supabase.admin
        .from('deliveries')
        .insert({
          order_id: orderId,
          delivery_partner_id: deliveryPartnerId,
          status: 'ASSIGNED' as DeliveryStatus,
          pickup_otp: pickupOtp,
          delivery_otp: deliveryOtp,
          assigned_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      deliveryRecord = data;
    }

    // Record history
    await this.supabase.admin.from('delivery_status_history').insert({
      delivery_id: deliveryRecord.id,
      status: 'ASSIGNED',
      notes: `Delivery assigned to partner by ${role.toLowerCase()}`,
    });

    return deliveryRecord;
  }

  /**
   * Helper to enrich delivery with joined order, shop, and address
   */
  private async enrichDeliveryRecord(d: any) {
    const { data: order } = await this.supabase.admin
      .from('orders')
      .select('*')
      .eq('id', d.order_id)
      .maybeSingle();

    if (!order) return d;

    const { data: shop } = await this.supabase.admin
      .from('shops')
      .select('*')
      .eq('id', order.shop_id)
      .maybeSingle();

    const { data: address } = await this.supabase.admin
      .from('user_addresses')
      .select('*')
      .eq('id', order.address_id)
      .maybeSingle();

    return {
      ...d,
      orders: {
        ...order,
        shops: shop ?? null,
        user_addresses: address ?? null,
      },
    };
  }

  /**
   * Get active assigned deliveries for a delivery partner
   */
  async getAssignedDeliveries(partnerId: string) {
    const { data, error } = await this.supabase.admin
      .from('deliveries')
      .select('*')
      .eq('delivery_partner_id', partnerId)
      .in('status', ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    const enriched = await Promise.all((data || []).map((d) => this.enrichDeliveryRecord(d)));
    return enriched.map((d) => this.sanitizeDeliveryPayload(d, 'DELIVERY_PARTNER'));
  }

  /**
   * Get delivery history for a delivery partner
   */
  async getDeliveryHistory(partnerId: string) {
    const { data, error } = await this.supabase.admin
      .from('deliveries')
      .select('*')
      .eq('delivery_partner_id', partnerId)
      .in('status', ['DELIVERED', 'FAILED', 'CANCELLED'])
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const enriched = await Promise.all((data || []).map((d) => this.enrichDeliveryRecord(d)));
    return enriched.map((d) => this.sanitizeDeliveryPayload(d, 'DELIVERY_PARTNER'));
  }

  /**
   * Get single delivery details
   */
  async getDeliveryById(deliveryId: string, userId: string, role: UserRole) {
    const { data: delivery, error } = await this.supabase.admin
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .maybeSingle();

    if (error || !delivery) {
      throw new NotFoundException('Delivery assignment not found');
    }

    const enriched = await this.enrichDeliveryRecord(delivery);
    const order = enriched.orders;

    if (role === 'DELIVERY_PARTNER' && delivery.delivery_partner_id !== userId) {
      throw new ForbiddenException('You do not have permission to access this delivery');
    }

    if (role === 'CONSUMER' && order?.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this delivery');
    }

    if (role === 'SELLER' && order?.shops?.seller_id !== userId) {
      throw new ForbiddenException('You do not have access to this delivery');
    }

    return this.sanitizeDeliveryPayload(enriched, role);
  }

  /**
   * Partner accepts the delivery assignment
   */
  async acceptDelivery(deliveryId: string, partnerId: string) {
    const { data: delivery, error } = await this.supabase.admin
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .maybeSingle();

    if (error || !delivery) {
      throw new NotFoundException('Delivery assignment not found');
    }

    if (delivery.delivery_partner_id !== partnerId) {
      throw new ForbiddenException('You are not assigned to this delivery.');
    }

    if (delivery.status !== 'ASSIGNED') {
      throw new BadRequestException(`Cannot accept delivery in "${delivery.status}" status.`);
    }

    const { data: updated, error: updateErr } = await this.supabase.admin
      .from('deliveries')
      .update({
        status: 'ACCEPTED' as DeliveryStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    await this.supabase.admin.from('delivery_status_history').insert({
      delivery_id: deliveryId,
      status: 'ACCEPTED',
      notes: 'Delivery assignment accepted by partner',
    });

    return updated;
  }

  /**
   * Partner confirms physical pickup at Shop using Pickup OTP
   */
  async confirmPickup(deliveryId: string, partnerId: string, dto: DeliveryConfirmPickupDto) {
    const { pickupOtp, notes } = dto;

    const { data: delivery, error } = await this.supabase.admin
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .maybeSingle();

    if (error || !delivery) {
      throw new NotFoundException('Delivery assignment not found');
    }

    if (delivery.delivery_partner_id !== partnerId) {
      throw new ForbiddenException('You are not assigned to this delivery.');
    }

    if (!['ASSIGNED', 'ACCEPTED'].includes(delivery.status)) {
      throw new BadRequestException(`Cannot confirm pickup in "${delivery.status}" status.`);
    }

    // OTP verification
    if (delivery.pickup_otp !== pickupOtp) {
      throw new BadRequestException(
        'Invalid pickup OTP. Please verify the 4-digit code provided by the shopkeeper.',
      );
    }

    // 1. Update delivery to PICKED_UP
    const { data: updatedDelivery, error: updateErr } = await this.supabase.admin
      .from('deliveries')
      .update({
        status: 'PICKED_UP' as DeliveryStatus,
        picked_up_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 2. Synchronize parent order to PICKED_UP
    const { data: order } = await this.supabase.admin
      .from('orders')
      .select('*')
      .eq('id', delivery.order_id)
      .maybeSingle();

    if (order) {
      await this.supabase.admin
        .from('orders')
        .update({
          status: 'PICKED_UP' as OrderStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      await this.supabase.admin.from('order_status_history').insert({
        order_id: order.id,
        previous_status: order.status,
        new_status: 'PICKED_UP',
        changed_by: partnerId,
        notes: 'Order picked up from shop by delivery partner',
      });
    }

    // 3. Record history
    await this.supabase.admin.from('delivery_status_history').insert({
      delivery_id: deliveryId,
      status: 'PICKED_UP',
      notes: notes ?? 'Order picked up successfully with verified OTP',
    });

    return updatedDelivery;
  }

  /**
   * Partner starts delivery transit to customer destination
   */
  async startDelivery(deliveryId: string, partnerId: string) {
    const { data: delivery, error } = await this.supabase.admin
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .maybeSingle();

    if (error || !delivery) {
      throw new NotFoundException('Delivery assignment not found');
    }

    if (delivery.delivery_partner_id !== partnerId) {
      throw new ForbiddenException('You are not assigned to this delivery.');
    }

    if (delivery.status !== 'PICKED_UP') {
      throw new BadRequestException(
        `Cannot start transit. Order must be in PICKED_UP status (currently ${delivery.status}).`,
      );
    }

    // 1. Update delivery status
    const { data: updatedDelivery, error: updateErr } = await this.supabase.admin
      .from('deliveries')
      .update({
        status: 'OUT_FOR_DELIVERY' as DeliveryStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 2. Synchronize parent order
    const { data: order } = await this.supabase.admin
      .from('orders')
      .select('*')
      .eq('id', delivery.order_id)
      .maybeSingle();

    if (order) {
      await this.supabase.admin
        .from('orders')
        .update({
          status: 'OUT_FOR_DELIVERY' as OrderStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      await this.supabase.admin.from('order_status_history').insert({
        order_id: order.id,
        previous_status: order.status,
        new_status: 'OUT_FOR_DELIVERY',
        changed_by: partnerId,
        notes: 'Delivery partner is en route to destination',
      });
    }

    // 3. Record history
    await this.supabase.admin.from('delivery_status_history').insert({
      delivery_id: deliveryId,
      status: 'OUT_FOR_DELIVERY',
      notes: 'Out for delivery to customer',
    });

    return updatedDelivery;
  }

  /**
   * Partner confirms handover to customer with Delivery OTP
   */
  async confirmDelivery(deliveryId: string, partnerId: string, dto: DeliveryConfirmDeliveryDto) {
    const { deliveryOtp, notes } = dto;

    const { data: delivery, error } = await this.supabase.admin
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .maybeSingle();

    if (error || !delivery) {
      throw new NotFoundException('Delivery assignment not found');
    }

    if (delivery.delivery_partner_id !== partnerId) {
      throw new ForbiddenException('You are not assigned to this delivery.');
    }

    if (delivery.status !== 'OUT_FOR_DELIVERY') {
      throw new BadRequestException(
        `Cannot confirm delivery. Status must be OUT_FOR_DELIVERY (currently ${delivery.status}).`,
      );
    }

    // OTP verification
    if (delivery.delivery_otp !== deliveryOtp) {
      throw new BadRequestException(
        'Invalid delivery OTP. Please ask the customer for their 4-digit delivery code.',
      );
    }

    // 1. Update delivery to DELIVERED
    const { data: updatedDelivery, error: updateErr } = await this.supabase.admin
      .from('deliveries')
      .update({
        status: 'DELIVERED' as DeliveryStatus,
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 2. Synchronize parent order to DELIVERED
    const { data: order } = await this.supabase.admin
      .from('orders')
      .select('*')
      .eq('id', delivery.order_id)
      .maybeSingle();

    if (order) {
      const isCod = order.payment_method === 'CASH_ON_DELIVERY';
      const updatedPaymentStatus: PaymentStatus = isCod ? 'PAID' : order.payment_status;

      await this.supabase.admin
        .from('orders')
        .update({
          status: 'DELIVERED' as OrderStatus,
          payment_status: updatedPaymentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      // If COD, update payment record
      if (isCod) {
        await this.supabase.admin
          .from('payments')
          .update({
            status: 'PAID' as PaymentStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('order_id', order.id);
      }

      await this.supabase.admin.from('order_status_history').insert({
        order_id: order.id,
        previous_status: order.status,
        new_status: 'DELIVERED',
        changed_by: partnerId,
        notes: `Delivered successfully via OTP confirmation${isCod ? ' (Cash collected)' : ''}`,
      });
    }

    // 3. Record history
    await this.supabase.admin.from('delivery_status_history').insert({
      delivery_id: deliveryId,
      status: 'DELIVERED',
      notes: notes ?? 'Order successfully handed over to customer with verified OTP',
    });

    return updatedDelivery;
  }

  /**
   * Report delivery issue or failure (e.g., customer unreachable, address not found)
   */
  async reportDeliveryFailure(
    deliveryId: string,
    partnerId: string,
    dto: DeliveryFailureReportDto,
  ) {
    const { reason, notes } = dto;

    const { data: delivery, error } = await this.supabase.admin
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .maybeSingle();

    if (error || !delivery) {
      throw new NotFoundException('Delivery assignment not found');
    }

    if (delivery.delivery_partner_id !== partnerId) {
      throw new ForbiddenException('You are not assigned to this delivery.');
    }

    if (['DELIVERED', 'CANCELLED', 'FAILED'].includes(delivery.status)) {
      throw new BadRequestException(`Cannot report failure on ${delivery.status} delivery.`);
    }

    // 1. Update delivery to FAILED
    const { data: updatedDelivery, error: updateErr } = await this.supabase.admin
      .from('deliveries')
      .update({
        status: 'FAILED' as DeliveryStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 2. Synchronize parent order
    const { data: order } = await this.supabase.admin
      .from('orders')
      .select('*')
      .eq('id', delivery.order_id)
      .maybeSingle();

    if (order) {
      await this.supabase.admin
        .from('orders')
        .update({
          status: 'FAILED' as OrderStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      await this.supabase.admin.from('order_status_history').insert({
        order_id: order.id,
        previous_status: order.status,
        new_status: 'FAILED',
        changed_by: partnerId,
        notes: `Delivery failed: ${reason}`,
      });
    }

    // 3. Record history
    await this.supabase.admin.from('delivery_status_history').insert({
      delivery_id: deliveryId,
      status: 'FAILED',
      notes: `Failure reason: ${reason}. Notes: ${notes ?? 'None'}`,
    });

    return updatedDelivery;
  }

  /**
   * Generic Status Transition (with State Machine Validation)
   */
  async updateDeliveryStatus(
    deliveryId: string,
    newStatus: DeliveryStatus,
    userId: string,
    role: UserRole,
    lat?: number,
    lng?: number,
    notes?: string,
  ) {
    const { data: existing, error: fetchErr } = await this.supabase.admin
      .from('deliveries')
      .select('id, delivery_partner_id, status')
      .eq('id', deliveryId)
      .maybeSingle();

    if (fetchErr || !existing) {
      throw new NotFoundException('Delivery assignment not found');
    }

    if (role !== 'ADMIN' && existing.delivery_partner_id !== userId) {
      throw new ForbiddenException('You are not assigned to this delivery');
    }

    const previousStatus = existing.status as DeliveryStatus;
    if (previousStatus === newStatus) {
      return existing;
    }

    // Verify valid state transition
    const allowed = VALID_DELIVERY_TRANSITIONS[previousStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid delivery status transition from "${previousStatus}" to "${newStatus}".`,
      );
    }

    const { data, error } = await this.supabase.admin
      .from('deliveries')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    await this.supabase.admin.from('delivery_status_history').insert({
      delivery_id: deliveryId,
      status: newStatus,
      latitude: lat ?? null,
      longitude: lng ?? null,
      notes: notes ?? null,
    });

    return data;
  }
}
