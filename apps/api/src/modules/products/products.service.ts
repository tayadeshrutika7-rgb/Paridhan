import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { Database, ProductStatus } from '@paridhan/types';
import {
  ProductCreateDto,
  ProductUpdateDto,
  ProductVariantCreateDto,
  ProductVariantUpdateDto,
  ProductFilterDto,
} from '@paridhan/validation';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Helper: Resolves the seller's shop ID and enforces ownership.
   */
  private async getSellerShopId(sellerId: string): Promise<string> {
    const { data: shop } = await this.supabase.admin
      .from('shops')
      .select('id')
      .eq('seller_id', sellerId)
      .maybeSingle();

    if (!shop) {
      throw new BadRequestException('Seller has no registered shop. Please create a shop first.');
    }
    return shop.id;
  }

  /**
   * Creates a product with multiple variants and gallery images.
   */
  async createProduct(sellerId: string, dto: ProductCreateDto) {
    const shopId = dto.shopId || (await this.getSellerShopId(sellerId));

    // Verify shop ownership
    const { data: shop } = await this.supabase.admin
      .from('shops')
      .select('id, seller_id')
      .eq('id', shopId)
      .maybeSingle();

    if (!shop || shop.seller_id !== sellerId) {
      throw new ForbiddenException('You do not have permission to add products to this shop');
    }

    // 1. Generate product slug
    const baseSlug = dto.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    // 2. Insert product record
    const { data: product, error: productError } = await this.supabase.admin
      .from('products')
      .insert({
        shop_id: shopId,
        category_id: dto.categoryId,
        subcategory_id: dto.subcategoryId ?? null,
        brand_id: dto.brandId ?? null,
        name: dto.name,
        slug,
        description: dto.description,
        base_price: dto.basePrice,
        status: 'ACTIVE' as ProductStatus,
        is_bargaining_allowed: dto.isBargainingAllowed ?? true,
        min_bargain_price: dto.minBargainPrice ?? null,
      })
      .select()
      .single();

    if (productError || !product) {
      this.logger.error(`Error creating product: ${productError?.message}`);
      throw new BadRequestException('Failed to create product');
    }

    // 3. Insert product variants
    const variantInserts = dto.variants.map((v) => ({
      product_id: product.id,
      sku: v.sku.trim().toUpperCase(),
      size: v.size.trim(),
      color: v.color.trim(),
      price: v.price || dto.basePrice,
      stock_quantity: v.stockQuantity ?? 0,
      is_active: v.isActive ?? true,
    }));

    const { data: variants, error: variantError } = await this.supabase.admin
      .from('product_variants')
      .insert(variantInserts)
      .select();

    if (variantError || !variants) {
      this.logger.error(`Error creating variants: ${variantError?.message}`);
      throw new BadRequestException(`Failed to create product variants: ${variantError?.message}`);
    }

    // 4. Log initial stock movements for variants with positive stock
    for (const variant of variants) {
      if (variant.stock_quantity > 0) {
        await this.supabase.admin.from('inventory_movements').insert({
          variant_id: variant.id,
          quantity_change: variant.stock_quantity,
          reason: 'RESTOCK',
          reference_id: product.id,
        });
      }
    }

    // 5. Insert images if provided
    if (dto.images && dto.images.length > 0) {
      const imageInserts = dto.images.map((url, index) => ({
        product_id: product.id,
        image_url: url,
        display_order: index,
        is_primary: index === 0,
      }));
      await this.supabase.admin.from('product_images').insert(imageInserts);
    }

    return this.getProductByIdOrSlug(product.id);
  }

  /**
   * Updates product metadata.
   */
  async updateProduct(sellerId: string, productId: string, dto: ProductUpdateDto) {
    const { data: product } = await this.supabase.admin
      .from('products')
      .select('id, shop_id')
      .eq('id', productId)
      .maybeSingle();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const { data: shop } = await this.supabase.admin
      .from('shops')
      .select('id, seller_id')
      .eq('id', product.shop_id)
      .maybeSingle();

    if (!shop || shop.seller_id !== sellerId) {
      throw new ForbiddenException('You do not own this product');
    }

    const updatePayload: Database['public']['Tables']['products']['Update'] = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) updatePayload.name = dto.name;
    if (dto.description !== undefined) updatePayload.description = dto.description;
    if (dto.basePrice !== undefined) updatePayload.base_price = dto.basePrice;
    if (dto.categoryId !== undefined) updatePayload.category_id = dto.categoryId;
    if (dto.subcategoryId !== undefined) updatePayload.subcategory_id = dto.subcategoryId;
    if (dto.brandId !== undefined) updatePayload.brand_id = dto.brandId;
    if (dto.isBargainingAllowed !== undefined) updatePayload.is_bargaining_allowed = dto.isBargainingAllowed;
    if (dto.minBargainPrice !== undefined) updatePayload.min_bargain_price = dto.minBargainPrice;
    if (dto.status !== undefined) updatePayload.status = dto.status;

    const { data, error } = await this.supabase.admin
      .from('products')
      .update(updatePayload)
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to update product');
    }

    return data;
  }

  /**
   * Soft-archives a product.
   */
  async archiveProduct(sellerId: string, productId: string) {
    return this.updateProduct(sellerId, productId, { status: 'ARCHIVED' });
  }

  /**
   * Adds a variant to an existing product.
   */
  async addVariant(sellerId: string, productId: string, dto: ProductVariantCreateDto) {
    const { data: product } = await this.supabase.admin
      .from('products')
      .select('id, shop_id')
      .eq('id', productId)
      .maybeSingle();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const { data: shop } = await this.supabase.admin
      .from('shops')
      .select('id, seller_id')
      .eq('id', product.shop_id)
      .maybeSingle();

    if (!shop || shop.seller_id !== sellerId) {
      throw new ForbiddenException('You do not own this product');
    }

    const sku = dto.sku.trim().toUpperCase();

    // Check SKU collision
    const { data: existingSku } = await this.supabase.admin
      .from('product_variants')
      .select('id')
      .eq('sku', sku)
      .maybeSingle();

    if (existingSku) {
      throw new BadRequestException(`SKU "${sku}" already exists. Each variant must have a unique SKU.`);
    }

    const { data: variant, error } = await this.supabase.admin
      .from('product_variants')
      .insert({
        product_id: productId,
        sku,
        size: dto.size.trim(),
        color: dto.color.trim(),
        price: dto.price,
        stock_quantity: dto.stockQuantity ?? 0,
        is_active: dto.isActive ?? true,
      })
      .select()
      .single();

    if (error || !variant) {
      throw new BadRequestException(`Failed to add variant: ${error?.message}`);
    }

    if (variant.stock_quantity > 0) {
      await this.supabase.admin.from('inventory_movements').insert({
        variant_id: variant.id,
        quantity_change: variant.stock_quantity,
        reason: 'RESTOCK',
        reference_id: productId,
      });
    }

    return variant;
  }

  /**
   * Updates an existing variant.
   */
  async updateVariant(sellerId: string, variantId: string, dto: ProductVariantUpdateDto) {
    const { data: variant } = await this.supabase.admin
      .from('product_variants')
      .select('id, product_id')
      .eq('id', variantId)
      .maybeSingle();

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    const { data: product } = await this.supabase.admin
      .from('products')
      .select('id, shop_id')
      .eq('id', variant.product_id)
      .maybeSingle();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const { data: shop } = await this.supabase.admin
      .from('shops')
      .select('id, seller_id')
      .eq('id', product.shop_id)
      .maybeSingle();

    if (!shop || shop.seller_id !== sellerId) {
      throw new ForbiddenException('You do not own this variant');
    }

    const updatePayload: Database['public']['Tables']['product_variants']['Update'] = {
      updated_at: new Date().toISOString(),
    };

    if (dto.size !== undefined) updatePayload.size = dto.size;
    if (dto.color !== undefined) updatePayload.color = dto.color;
    if (dto.price !== undefined) updatePayload.price = dto.price;
    if (dto.isActive !== undefined) updatePayload.is_active = dto.isActive;

    const { data, error } = await this.supabase.admin
      .from('product_variants')
      .update(updatePayload)
      .eq('id', variantId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to update variant');
    }

    return data;
  }

  /**
   * Retrieves single product by ID or Slug with images, variants, and shop info.
   */
  async getProductByIdOrSlug(idOrSlug: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const query = this.supabase.admin
      .from('products')
      .select('*, product_images(*), product_variants(*), shops(*), categories(*)');

    const { data, error } = isUuid
      ? await query.eq('id', idOrSlug).maybeSingle()
      : await query.eq('slug', idOrSlug).maybeSingle();

    if (error || !data) {
      throw new NotFoundException('Product not found');
    }

    return data;
  }

  async getProductById(id: string) {
    return this.getProductByIdOrSlug(id);
  }

  /**
   * Lists products with rich filtering (by category, shop, search query, price, stock).
   */
  async listProducts(filters: ProductFilterDto = {}) {
    let query = this.supabase.admin
      .from('products')
      .select('*, product_images(*), product_variants(*), shops(name, city, is_bargaining_enabled), categories(name)')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false });

    if (filters.shopId) query = query.eq('shop_id', filters.shopId);
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
    if (filters.subcategoryId) query = query.eq('subcategory_id', filters.subcategoryId);
    if (filters.brandId) query = query.eq('brand_id', filters.brandId);
    if (filters.minPrice !== undefined) query = query.gte('base_price', filters.minPrice);
    if (filters.maxPrice !== undefined) query = query.lte('base_price', filters.maxPrice);
    if (filters.search) query = query.ilike('name', `%${filters.search}%`);

    const { data, error } = await query;
    if (error) {
      this.logger.error(`Error querying products: ${error.message}`);
      throw new BadRequestException('Failed to retrieve products');
    }

    let results = data || [];
    if (filters.inStockOnly) {
      results = results.filter((p: any) =>
        p.product_variants?.some((v: any) => v.is_active && v.stock_quantity > 0),
      );
    }

    return results;
  }
}
