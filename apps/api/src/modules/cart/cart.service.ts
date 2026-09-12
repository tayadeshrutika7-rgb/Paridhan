import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

export interface AuthoritativeCartItem {
  id: string;
  cartId: string;
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  size: string;
  color: string;
  sku: string;
  quantity: number;
  availableStock: number;
  unitPrice: number;
  originalPrice: number;
  itemTotal: number;
  imageUrl?: string;
  shopId: string;
  shopName: string;
  bargainingSessionId?: string | null;
  isBargainedPrice: boolean;
  isAvailable: boolean;
  unavailableReason?: string;
  stockWarning: boolean;
}

export interface AuthoritativeCartSummary {
  cartId: string;
  items: AuthoritativeCartItem[];
  subtotalAmount: number;
  deliveryFee: number;
  totalAmount: number;
  totalItemsCount: number;
  availableItemsCount: number;
  hasUnavailableItems: boolean;
}

@Injectable()
export class CartService {
  constructor(private readonly supabase: SupabaseService) {}

  async getOrCreateCart(userId: string) {
    const { data: existingCart } = await this.supabase.admin
      .from('carts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingCart) return existingCart;

    const { data: newCart, error } = await this.supabase.admin
      .from('carts')
      .insert({ user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return newCart;
  }

  /**
   * Authoritative Cart Summary:
   * Critical Rule: Client cart data is NOT authoritative.
   * Re-fetches current Product, Variant, Price, Stock, Shop, and Bargained Price.
   */
  async getCartSummary(userId: string): Promise<AuthoritativeCartSummary> {
    const cart = await this.getOrCreateCart(userId);

    const { data: rawItems, error } = await this.supabase.admin
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
            shops (
              id,
              name,
              status
            ),
            product_images (
              image_url,
              is_primary
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

    if (error) throw error;

    let subtotalAmount = 0;
    let availableCount = 0;
    const items: AuthoritativeCartItem[] = [];

    for (const item of (rawItems || []) as any[]) {
      const variant = item.product_variants;
      const product = variant?.products;
      const shop = product?.shops;
      const bargainingSession = item.bargaining_sessions;

      let isAvailable = true;
      let unavailableReason: string | undefined;

      if (!variant || !product) {
        isAvailable = false;
        unavailableReason = 'Product or variant no longer exists';
      } else if (product.status !== 'ACTIVE') {
        isAvailable = false;
        unavailableReason = `Product is currently ${product.status.toLowerCase()}`;
      } else if (!variant.is_active) {
        isAvailable = false;
        unavailableReason = 'Selected variant is currently inactive';
      } else if (variant.stock_quantity <= 0) {
        isAvailable = false;
        unavailableReason = 'Item is out of stock';
      } else if (variant.stock_quantity < item.quantity) {
        isAvailable = false;
        unavailableReason = `Only ${variant.stock_quantity} available in stock`;
      }

      // Determine authoritative price
      let unitPrice = variant ? variant.price : 0;
      let isBargainedPrice = false;

      if (
        bargainingSession &&
        bargainingSession.status === 'ACCEPTED' &&
        bargainingSession.agreed_price != null
      ) {
        // Verify expiration if applicable
        if (!bargainingSession.expires_at || new Date(bargainingSession.expires_at) > new Date()) {
          unitPrice = bargainingSession.agreed_price;
          isBargainedPrice = true;
        }
      }

      const itemTotal = isAvailable ? unitPrice * item.quantity : 0;
      if (isAvailable) {
        subtotalAmount += itemTotal;
        availableCount += item.quantity;
      }

      const primaryImage = product?.product_images?.find((i: any) => i.is_primary)?.image_url ||
        product?.product_images?.[0]?.image_url;

      items.push({
        id: item.id,
        cartId: item.cart_id,
        variantId: item.variant_id,
        productId: product?.id || '',
        productName: product?.name || 'Unknown Product',
        productSlug: product?.slug || '',
        size: variant?.size || '',
        color: variant?.color || '',
        sku: variant?.sku || '',
        quantity: item.quantity,
        availableStock: variant?.stock_quantity ?? 0,
        unitPrice,
        originalPrice: variant?.price ?? 0,
        itemTotal,
        imageUrl: primaryImage,
        shopId: shop?.id || '',
        shopName: shop?.name || 'Unknown Shop',
        bargainingSessionId: item.bargaining_session_id,
        isBargainedPrice,
        isAvailable,
        unavailableReason,
        stockWarning: !!variant && variant.stock_quantity < item.quantity,
      });
    }

    // Delivery fee calculation: Free over ₹999, else ₹49 flat foundation
    const deliveryFee = subtotalAmount > 0 && subtotalAmount < 999 ? 49 : 0;
    const totalAmount = subtotalAmount + deliveryFee;

    return {
      cartId: cart.id,
      items,
      subtotalAmount,
      deliveryFee,
      totalAmount,
      totalItemsCount: items.reduce((sum, i) => sum + i.quantity, 0),
      availableItemsCount: availableCount,
      hasUnavailableItems: items.some((i) => !i.isAvailable),
    };
  }

  async addItem(userId: string, variantId: string, quantity: number, bargainingSessionId?: string) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    const cart = await this.getOrCreateCart(userId);

    // Verify variant and product authoritative state
    const { data: variant, error: varErr } = await this.supabase.admin
      .from('product_variants')
      .select('id, stock_quantity, is_active, price, products(status)')
      .eq('id', variantId)
      .maybeSingle();

    if (varErr || !variant) {
      throw new NotFoundException('Variant not found');
    }

    const product = (variant as any).products;
    if (product?.status !== 'ACTIVE' || !variant.is_active) {
      throw new BadRequestException('This product or variant is currently inactive');
    }

    // Check existing item in cart
    const { data: existingItem } = await this.supabase.admin
      .from('cart_items')
      .select('*')
      .eq('cart_id', cart.id)
      .eq('variant_id', variantId)
      .maybeSingle();

    const targetQuantity = existingItem ? existingItem.quantity + quantity : quantity;

    if (variant.stock_quantity < targetQuantity) {
      throw new BadRequestException(
        `Cannot add ${quantity} item(s). Only ${variant.stock_quantity} available in stock.`,
      );
    }

    if (existingItem) {
      const { data, error } = await this.supabase.admin
        .from('cart_items')
        .update({
          quantity: targetQuantity,
          bargaining_session_id: bargainingSessionId ?? existingItem.bargaining_session_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingItem.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const { data, error } = await this.supabase.admin
        .from('cart_items')
        .insert({
          cart_id: cart.id,
          variant_id: variantId,
          quantity,
          bargaining_session_id: bargainingSessionId ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  }

  async updateQuantity(userId: string, cartItemId: string, quantity: number) {
    const cart = await this.getOrCreateCart(userId);

    // If quantity is 0 or less, remove item
    if (quantity <= 0) {
      return this.removeItem(userId, cartItemId);
    }

    const { data: cartItem, error: fetchErr } = await this.supabase.admin
      .from('cart_items')
      .select('*, product_variants(stock_quantity, is_active)')
      .eq('id', cartItemId)
      .eq('cart_id', cart.id)
      .maybeSingle();

    if (fetchErr || !cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    const variant = (cartItem as any).product_variants;
    if (!variant || !variant.is_active) {
      throw new BadRequestException('Selected variant is no longer active');
    }

    if (variant.stock_quantity < quantity) {
      throw new BadRequestException(
        `Requested quantity (${quantity}) exceeds available stock (${variant.stock_quantity})`,
      );
    }

    const { data, error } = await this.supabase.admin
      .from('cart_items')
      .update({ quantity, updated_at: new Date().toISOString() })
      .eq('id', cartItemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async removeItem(userId: string, cartItemId: string) {
    const cart = await this.getOrCreateCart(userId);

    const { error } = await this.supabase.admin
      .from('cart_items')
      .delete()
      .eq('id', cartItemId)
      .eq('cart_id', cart.id);

    if (error) throw error;
    return { success: true, message: 'Item removed from cart' };
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    const { error } = await this.supabase.admin
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id);

    if (error) throw error;
    return { success: true, message: 'Cart cleared successfully' };
  }
}
