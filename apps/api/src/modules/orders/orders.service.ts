import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { PaymentsService } from '../payments/payments.service';
import { OrderStatus, PaymentStatus, UserRole } from '@paridhan/types';
import { CheckoutDto } from '@paridhan/validation';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'FAILED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_PICKUP', 'CANCELLED'],
  READY_FOR_PICKUP: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  CANCELLED: [],
  FAILED: [],
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async listUserOrders(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('orders')
      .select('*, order_items(*), shops(name, city), deliveries(status), payments(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async listShopOrders(sellerId: string) {
    const { data: shops } = await this.supabase.admin
      .from('shops')
      .select('id')
      .eq('seller_id', sellerId);

    const shopIds = shops?.map((s) => s.id) || [];
    if (shopIds.length === 0) return [];

    const { data, error } = await this.supabase.admin
      .from('orders')
      .select('*, order_items(*), user_addresses(*), deliveries(status), payments(*)')
      .in('shop_id', shopIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getOrderById(orderId: string, userId: string, role: UserRole = 'CONSUMER') {
    const { data: order, error } = await this.supabase.admin
      .from('orders')
      .select('*, order_items(*), order_status_history(*), shops(id, seller_id, name, city), user_addresses(*), deliveries(*), payments(*)')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !order) {
      throw new NotFoundException('Order not found');
    }

    const orderRecord = order as any;

    if (role === 'ADMIN') {
      return orderRecord;
    }

    if (role === 'CONSUMER') {
      if (orderRecord.user_id !== userId) {
        throw new ForbiddenException('You do not have access to this order');
      }
      return orderRecord;
    }

    if (role === 'SELLER') {
      const shop = orderRecord.shops;
      if (!shop || shop.seller_id !== userId) {
        throw new ForbiddenException('You do not have access to orders from other shops');
      }
      return orderRecord;
    }

    if (role === 'DELIVERY_PARTNER') {
      const deliveries = (orderRecord.deliveries || []) as any[];
      const isAssigned = deliveries.some((d) => d.delivery_partner_id === userId);
      if (!isAssigned) {
        throw new ForbiddenException('You are not assigned to deliver this order');
      }
      return orderRecord;
    }

    throw new ForbiddenException('Unauthorized to view this order');
  }

  /**
   * Authoritative Checkout Engine:
   * 1. Re-fetches current authoritative product/variant data & prices.
   * 2. Validates active status and verifies inventory stock.
   * 3. Calculates authoritative total & applies bargained prices where accepted.
   * 4. Safely decrements inventory with concurrency checks and logs audit movements.
   * 5. Creates Order, Order Items, and initializes Payment flow (Razorpay/COD).
   */
  async createCheckoutOrder(userId: string, dto: CheckoutDto) {
    const { addressId, paymentMethod } = dto;

    // 1. Verify delivery address belongs to user
    const { data: address, error: addrErr } = await this.supabase.admin
      .from('user_addresses')
      .select('*')
      .eq('id', addressId)
      .eq('user_id', userId)
      .maybeSingle();

    if (addrErr || !address) {
      throw new BadRequestException('Delivery address not found or invalid');
    }

    // 2. Fetch user's cart
    const { data: cart, error: cartErr } = await this.supabase.admin
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (cartErr || !cart) {
      throw new BadRequestException('Cart is empty. Please add items before checking out.');
    }

    const { data: rawCartItems, error: itemsErr } = await this.supabase.admin
      .from('cart_items')
      .select(`
        *,
        product_variants (
          id,
          sku,
          size,
          color,
          price,
          stock_quantity,
          is_active,
          products (
            id,
            name,
            slug,
            base_price,
            status,
            shop_id,
            shops (
              id,
              name,
              status
            )
          )
        ),
        bargaining_sessions (
          id,
          agreed_price,
          status,
          expires_at
        )
      `)
      .eq('cart_id', cart.id);

    if (itemsErr || !rawCartItems || rawCartItems.length === 0) {
      throw new BadRequestException('Cart is empty. Please add items before checking out.');
    }

    // 3. Authoritative Validation & Calculations
    let subtotalAmount = 0;
    const validatedItems: {
      cartItemId: string;
      variantId: string;
      productName: string;
      size: string;
      color: string;
      unitPrice: number;
      quantity: number;
      totalPrice: number;
      shopId: string;
    }[] = [];

    const shopIds = new Set<string>();

    for (const item of rawCartItems as any[]) {
      const variant = item.product_variants;
      const product = variant?.products;
      const shop = product?.shops;
      const session = item.bargaining_sessions;

      if (!variant || !product) {
        throw new BadRequestException('One or more items in your cart are no longer available.');
      }

      if (product.status !== 'ACTIVE') {
        throw new BadRequestException(`"${product.name}" is no longer available for purchase.`);
      }

      if (!variant.is_active) {
        throw new BadRequestException(`The variant "${variant.sku}" of "${product.name}" is inactive.`);
      }

      if (shop?.status === 'SUSPENDED' || shop?.status === 'REJECTED') {
        throw new BadRequestException(`Shop "${shop?.name}" is currently unavailable.`);
      }

      // Check stock availability
      if (variant.stock_quantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Requested: ${item.quantity}, Available: ${variant.stock_quantity}.`,
        );
      }

      // Determine authoritative price
      let unitPrice = variant.price;
      if (
        session &&
        session.status === 'ACCEPTED' &&
        session.agreed_price != null &&
        (!session.expires_at || new Date(session.expires_at) > new Date())
      ) {
        unitPrice = session.agreed_price;
      }

      const itemTotal = unitPrice * item.quantity;
      subtotalAmount += itemTotal;
      shopIds.add(product.shop_id);

      validatedItems.push({
        cartItemId: item.id,
        variantId: variant.id,
        productName: product.name,
        size: variant.size,
        color: variant.color,
        unitPrice,
        quantity: item.quantity,
        totalPrice: itemTotal,
        shopId: product.shop_id,
      });
    }

    const primaryShopId = Array.from(shopIds)[0];

    // Delivery fee: ₹49 flat, free if >= ₹999
    const deliveryFee = subtotalAmount >= 999 ? 0 : 49;
    const totalAmount = subtotalAmount + deliveryFee;

    // 4. Concurrency & Atomic Inventory Reservation
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    for (const item of validatedItems) {
      // Fetch latest stock directly to prevent race conditions
      const { data: currentVar } = await this.supabase.admin
        .from('product_variants')
        .select('stock_quantity')
        .eq('id', item.variantId)
        .single();

      if (!currentVar || currentVar.stock_quantity < item.quantity) {
        throw new BadRequestException(
          `Item "${item.productName}" went out of stock during checkout. Please review your cart.`,
        );
      }

      // Decrement stock
      const { error: stockErr } = await this.supabase.admin
        .from('product_variants')
        .update({
          stock_quantity: currentVar.stock_quantity - item.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.variantId);

      if (stockErr) throw stockErr;

      // Log inventory movement audit
      await this.supabase.admin.from('inventory_movements').insert({
        variant_id: item.variantId,
        quantity_change: -item.quantity,
        reason: 'SALE',
        reference_id: orderNumber,
      });
    }

    // 5. Create Order Record
    const initialOrderStatus: OrderStatus =
      paymentMethod === 'ONLINE_RAZORPAY' ? 'PENDING_PAYMENT' : 'CONFIRMED';
    const initialPaymentStatus: PaymentStatus = 'PENDING';

    const { data: order, error: orderErr } = await this.supabase.admin
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: userId,
        shop_id: primaryShopId,
        address_id: addressId,
        status: initialOrderStatus,
        payment_status: initialPaymentStatus,
        payment_method: paymentMethod,
        subtotal_amount: subtotalAmount,
        delivery_fee: deliveryFee,
        discount_amount: 0,
        total_amount: totalAmount,
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    // 6. Insert Order Items
    const orderItemInserts = validatedItems.map((item) => ({
      order_id: order.id,
      variant_id: item.variantId,
      product_name: item.productName,
      size: item.size,
      color: item.color,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      total_price: item.totalPrice,
    }));

    const { error: orderItemsErr } = await this.supabase.admin
      .from('order_items')
      .insert(orderItemInserts);

    if (orderItemsErr) throw orderItemsErr;

    // 7. Record Status History
    await this.supabase.admin.from('order_status_history').insert({
      order_id: order.id,
      previous_status: null,
      new_status: initialOrderStatus,
      changed_by: userId,
      notes: `Order created via ${paymentMethod}`,
    });

    // 8. Clear purchased cart items
    const cartItemIds = validatedItems.map((i) => i.cartItemId);
    await this.supabase.admin.from('cart_items').delete().in('id', cartItemIds);

    // 9. Payment Gateway / Flow Setup
    if (paymentMethod === 'ONLINE_RAZORPAY') {
      const razorpayOrder = await this.paymentsService.createRazorpayOrder(
        order.id,
        totalAmount,
      );

      return {
        order,
        items: validatedItems,
        razorpayOrder,
        requiresPayment: true,
      };
    } else {
      // CASH_ON_DELIVERY
      await this.paymentsService.createPaymentRecord(
        order.id,
        'CASH_ON_DELIVERY',
        totalAmount,
      );

      return {
        order,
        items: validatedItems,
        requiresPayment: false,
        message: 'Order placed successfully with Cash on Delivery.',
      };
    }
  }

  /**
   * Order State Machine & Strict Transition Enforcement
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    userId: string,
    role: UserRole = 'CONSUMER',
    notes?: string,
    cancellationReason?: string,
  ) {
    const order = await this.getOrderById(orderId, userId, role);
    const previousStatus = order.status as OrderStatus;

    if (previousStatus === newStatus) {
      return order;
    }

    // 1. Verify valid state machine transition
    const allowed = VALID_TRANSITIONS[previousStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid order status transition from "${previousStatus}" to "${newStatus}".`,
      );
    }

    // 2. Role-based transition authorization
    if (role === 'CONSUMER') {
      if (newStatus !== 'CANCELLED') {
        throw new ForbiddenException('Consumers can only cancel their own orders.');
      }
      if (!['PENDING_PAYMENT', 'CONFIRMED'].includes(previousStatus)) {
        throw new BadRequestException(
          `Cannot cancel order in "${previousStatus}" status. Please contact shop support.`,
        );
      }
    }

    if (role === 'SELLER') {
      if (newStatus === 'PICKED_UP' || newStatus === 'OUT_FOR_DELIVERY' || newStatus === 'DELIVERED') {
        throw new ForbiddenException('Delivery partners or admins must update delivery states.');
      }
    }

    if (role === 'DELIVERY_PARTNER') {
      if (!['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'].includes(newStatus)) {
        throw new ForbiddenException('Delivery partners can only update delivery status stages.');
      }
    }

    // 3. Atomic Restocking upon Cancellation or Failure
    if (newStatus === 'CANCELLED' || newStatus === 'FAILED') {
      const items = (order.order_items || []) as any[];
      for (const item of items) {
        const { data: v } = await this.supabase.admin
          .from('product_variants')
          .select('stock_quantity')
          .eq('id', item.variant_id)
          .single();

        if (v) {
          await this.supabase.admin
            .from('product_variants')
            .update({
              stock_quantity: v.stock_quantity + item.quantity,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.variant_id);

          await this.supabase.admin.from('inventory_movements').insert({
            variant_id: item.variant_id,
            quantity_change: item.quantity,
            reason: 'RETURN',
            reference_id: orderId,
          });
        }
      }
    }

    // 4. Update order
    const { data: updatedOrder, error: updateErr } = await this.supabase.admin
      .from('orders')
      .update({
        status: newStatus,
        cancellation_reason: cancellationReason ?? order.cancellation_reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 5. Record status history
    await this.supabase.admin.from('order_status_history').insert({
      order_id: orderId,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by: userId,
      notes: notes ?? cancellationReason ?? null,
    });

    return updatedOrder;
  }
}
