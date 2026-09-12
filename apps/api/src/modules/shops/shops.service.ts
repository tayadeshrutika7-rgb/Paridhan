import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { Database, ShopStatus } from '@paridhan/types';
import { ShopCreateDto, ShopUpdateDto } from '@paridhan/validation';

@Injectable()
export class ShopsService {
  private readonly logger = new Logger(ShopsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Creates a new shop for the authenticated seller.
   */
  async createShop(sellerId: string, dto: ShopCreateDto) {
    // 1. Check if seller already has a shop
    const { data: existingShop } = await this.supabase.admin
      .from('shops')
      .select('id, name')
      .eq('seller_id', sellerId)
      .maybeSingle();

    if (existingShop) {
      throw new BadRequestException('Seller already has a registered shop');
    }

    // 2. Generate slug
    const baseSlug = dto.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    // 3. Insert shop record
    const { data: shop, error } = await this.supabase.admin
      .from('shops')
      .insert({
        seller_id: sellerId,
        name: dto.name,
        slug,
        description: dto.description ?? null,
        address_line1: dto.addressLine1,
        address_line2: dto.addressLine2 ?? null,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        latitude: dto.latitude ?? 26.9124,
        longitude: dto.longitude ?? 75.7873,
        phone: dto.phone,
        status: 'PENDING' as ShopStatus,
        is_bargaining_enabled: dto.isBargainingEnabled ?? true,

        logo_url: dto.logoUrl ?? null,
        banner_url: dto.bannerUrl ?? null,
      })
      .select()
      .single();

    if (error || !shop) {
      this.logger.error(`Failed to create shop: ${error?.message}`);
      throw new BadRequestException('Failed to create shop');
    }

    return shop;
  }

  /**
   * Updates shop details with strict seller ownership check.
   */
  async updateShop(sellerId: string, shopId: string, dto: ShopUpdateDto) {
    const { data: existing } = await this.supabase.admin
      .from('shops')
      .select('id, seller_id')
      .eq('id', shopId)
      .maybeSingle();

    if (!existing) {
      throw new NotFoundException('Shop not found');
    }

    if (existing.seller_id !== sellerId) {
      throw new ForbiddenException('You do not own this shop');
    }

    const updateData: Database['public']['Tables']['shops']['Update'] = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.addressLine1 !== undefined) updateData.address_line1 = dto.addressLine1;
    if (dto.addressLine2 !== undefined) updateData.address_line2 = dto.addressLine2;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.state !== undefined) updateData.state = dto.state;
    if (dto.pincode !== undefined) updateData.pincode = dto.pincode;
    if (dto.latitude !== undefined) updateData.latitude = dto.latitude;
    if (dto.longitude !== undefined) updateData.longitude = dto.longitude;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.isBargainingEnabled !== undefined) updateData.is_bargaining_enabled = dto.isBargainingEnabled;
    if (dto.logoUrl !== undefined) updateData.logo_url = dto.logoUrl;
    if (dto.bannerUrl !== undefined) updateData.banner_url = dto.bannerUrl;

    const { data, error } = await this.supabase.admin
      .from('shops')
      .update(updateData)
      .eq('id', shopId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update shop: ${error.message}`);
      throw new BadRequestException('Failed to update shop details');
    }

    return data;
  }

  /**
   * Retrieves current seller's own shop.
   */
  async getSellerShop(sellerId: string) {
    const { data, error } = await this.supabase.admin
      .from('shops')
      .select('*, shop_images(*), products(count)')
      .eq('seller_id', sellerId)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException('No shop found for this seller account');
    }

    return data;
  }

  /**
   * Public shop retrieval by ID or Slug for consumers.
   */
  async getShopByIdOrSlug(idOrSlug: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const query = this.supabase.admin
      .from('shops')
      .select('*, shop_images(*), products(*, product_images(*), product_variants(*))');

    const { data, error } = isUuid
      ? await query.eq('id', idOrSlug).maybeSingle()
      : await query.eq('slug', idOrSlug).maybeSingle();

    if (error || !data) {
      throw new NotFoundException('Shop not found');
    }

    return data;
  }

  async getShopById(id: string) {
    return this.getShopByIdOrSlug(id);
  }

  /**
   * Public shop list for consumers.
   */
  async listShops(city?: string, search?: string) {
    let query = this.supabase.admin
      .from('shops')
      .select('*, shop_images(*)')
      .eq('status', 'VERIFIED')
      .order('rating', { ascending: false });

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) {
      this.logger.error(`Error listing shops: ${error.message}`);
      throw new BadRequestException('Failed to list shops');
    }

    return data;
  }

  /**
   * Adds an image to the shop gallery.
   */
  async addShopImage(sellerId: string, shopId: string, imageUrl: string, displayOrder = 0) {
    const { data: shop } = await this.supabase.admin
      .from('shops')
      .select('id, seller_id')
      .eq('id', shopId)
      .maybeSingle();

    if (!shop || shop.seller_id !== sellerId) {
      throw new ForbiddenException('You do not have permission to manage images for this shop');
    }

    const { data, error } = await this.supabase.admin
      .from('shop_images')
      .insert({
        shop_id: shopId,
        image_url: imageUrl,
        display_order: displayOrder,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to add shop image');
    }

    return data;
  }
}
