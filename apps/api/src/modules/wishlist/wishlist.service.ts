import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class WishlistService {
  constructor(private readonly supabase: SupabaseService) {}

  async getOrCreateWishlist(userId: string) {
    const { data: existing } = await this.supabase.admin
      .from('wishlists')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) return existing;

    const { data: newWishlist, error } = await this.supabase.admin
      .from('wishlists')
      .insert({ user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return newWishlist;
  }

  async getWishlistItems(userId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);
    const { data, error } = await this.supabase.admin
      .from('wishlist_items')
      .select('*, products(*, product_images(*), product_variants(*), shops(name, city, status))')
      .eq('wishlist_id', wishlist.id);

    if (error) throw error;

    // Process and attach real-time availability status
    return (data || []).map((item: any) => {
      const product = item.products;
      const variants = product?.product_variants || [];
      const isProductActive = product?.status === 'ACTIVE';
      const inStockVariants = variants.filter(
        (v: any) => v.is_active && v.stock_quantity > 0,
      );
      const isAvailable = isProductActive && inStockVariants.length > 0;

      return {
        id: item.id,
        wishlistId: item.wishlist_id,
        productId: item.product_id,
        createdAt: item.created_at,
        isAvailable,
        inStockVariantsCount: inStockVariants.length,
        product,
      };
    });
  }

  async addItem(userId: string, productId: string) {
    // Validate product exists
    const { data: product, error: prodErr } = await this.supabase.admin
      .from('products')
      .select('id, name')
      .eq('id', productId)
      .maybeSingle();

    if (prodErr || !product) {
      throw new NotFoundException('Product not found');
    }

    const wishlist = await this.getOrCreateWishlist(userId);

    const { data: existingItem } = await this.supabase.admin
      .from('wishlist_items')
      .select('id')
      .eq('wishlist_id', wishlist.id)
      .eq('product_id', productId)
      .maybeSingle();

    if (existingItem) {
      return { success: true, message: 'Product already in wishlist', item: existingItem };
    }

    const { data, error } = await this.supabase.admin
      .from('wishlist_items')
      .insert({
        wishlist_id: wishlist.id,
        product_id: productId,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, message: 'Product added to wishlist', item: data };
  }

  async removeItem(userId: string, productId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);
    const { error } = await this.supabase.admin
      .from('wishlist_items')
      .delete()
      .eq('wishlist_id', wishlist.id)
      .eq('product_id', productId);

    if (error) throw error;
    return { success: true, message: 'Product removed from wishlist' };
  }

  async toggleItem(userId: string, productId: string) {
    // Validate product exists
    const { data: product, error: prodErr } = await this.supabase.admin
      .from('products')
      .select('id')
      .eq('id', productId)
      .maybeSingle();

    if (prodErr || !product) {
      throw new NotFoundException('Product not found');
    }

    const wishlist = await this.getOrCreateWishlist(userId);

    const { data: existingItem } = await this.supabase.admin
      .from('wishlist_items')
      .select('id')
      .eq('wishlist_id', wishlist.id)
      .eq('product_id', productId)
      .maybeSingle();

    if (existingItem) {
      await this.supabase.admin.from('wishlist_items').delete().eq('id', existingItem.id);
      return { added: false, message: 'Product removed from wishlist' };
    } else {
      const { data, error } = await this.supabase.admin
        .from('wishlist_items')
        .insert({
          wishlist_id: wishlist.id,
          product_id: productId,
        })
        .select()
        .single();

      if (error) throw error;
      return { added: true, message: 'Product added to wishlist', item: data };
    }
  }
}
