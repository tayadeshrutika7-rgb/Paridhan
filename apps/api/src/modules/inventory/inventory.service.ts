import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { InventoryAdjustmentDto } from '@paridhan/validation';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Retrieves all inventory items for the seller's shop with low-stock / out-of-stock flags.
   */
  async getShopInventory(sellerId: string) {
    const { data: shop } = await this.supabase.admin
      .from('shops')
      .select('id')
      .eq('seller_id', sellerId)
      .maybeSingle();

    if (!shop) {
      throw new BadRequestException('Seller has no registered shop');
    }

    const { data, error } = await this.supabase.admin
      .from('product_variants')
      .select('*, products!inner(id, name, shop_id, status)')
      .eq('products.shop_id', shop.id)
      .order('stock_quantity', { ascending: true });

    if (error) {
      this.logger.error(`Error fetching shop inventory: ${error.message}`);
      throw new BadRequestException('Failed to fetch inventory');
    }

    return (data || []).map((v: any) => ({
      id: v.id,
      productId: v.product_id,
      productName: v.products?.name,
      sku: v.sku,
      size: v.size,
      color: v.color,
      price: v.price,
      stockQuantity: v.stock_quantity,
      isActive: v.is_active,
      isLowStock: v.stock_quantity <= 5 && v.stock_quantity > 0,
      isOutOfStock: v.stock_quantity <= 0,
      updatedAt: v.updated_at,
    }));
  }

  /**
   * Atomically adjusts variant stock level, prevents overselling, and logs an audit movement.
   */
  async adjustStock(sellerId: string, dto: InventoryAdjustmentDto) {
    // 1. Verify variant ownership
    const { data: variant, error: findError } = await this.supabase.admin
      .from('product_variants')
      .select('id, stock_quantity, products!inner(shop_id, shops!inner(seller_id))')
      .eq('id', dto.variantId)
      .maybeSingle();

    if (findError || !variant) {
      throw new NotFoundException('Variant not found');
    }

    const seller = (variant as any).products?.shops?.seller_id;
    if (seller !== sellerId) {
      throw new ForbiddenException('You do not own this inventory item');
    }

    const currentStock = variant.stock_quantity;
    const newStock = currentStock + dto.quantityChange;

    // 2. Prevent negative inventory / overselling
    if (newStock < 0) {
      throw new BadRequestException(
        `Cannot reduce stock by ${Math.abs(dto.quantityChange)}. Current stock is only ${currentStock}.`,
      );
    }

    // 3. Update stock quantity
    const { data: updatedVariant, error: updateError } = await this.supabase.admin
      .from('product_variants')
      .update({
        stock_quantity: newStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dto.variantId)
      .select()
      .single();

    if (updateError || !updatedVariant) {
      throw new BadRequestException('Failed to update inventory level');
    }

    // 4. Record audit movement in inventory_movements
    await this.supabase.admin.from('inventory_movements').insert({
      variant_id: dto.variantId,
      quantity_change: dto.quantityChange,
      reason: dto.reason || 'ADJUSTMENT',
      reference_id: dto.referenceId ?? null,
    });

    return {
      variantId: updatedVariant.id,
      sku: updatedVariant.sku,
      previousStock: currentStock,
      newStock: updatedVariant.stock_quantity,
      change: dto.quantityChange,
      reason: dto.reason,
    };
  }

  /**
   * Retrieves movement audit history for a specific variant.
   */
  async getVariantMovements(sellerId: string, variantId: string) {
    const { data: variant } = await this.supabase.admin
      .from('product_variants')
      .select('id, products!inner(shops!inner(seller_id))')
      .eq('id', variantId)
      .maybeSingle();

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    const seller = (variant as any).products?.shops?.seller_id;
    if (seller !== sellerId) {
      throw new ForbiddenException('You do not have access to movements for this variant');
    }

    const { data, error } = await this.supabase.admin
      .from('inventory_movements')
      .select('*')
      .eq('variant_id', variantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException('Failed to retrieve inventory movements');
    }

    return data;
  }

  /**
   * Helper: Checks single variant stock.
   */
  async getVariantStock(variantId: string): Promise<number> {
    const { data, error } = await this.supabase.admin
      .from('product_variants')
      .select('stock_quantity')
      .eq('id', variantId)
      .single();

    if (error || !data) throw new BadRequestException('Invalid variant ID');
    return data.stock_quantity;
  }
}
