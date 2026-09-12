import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { LocationsService } from '../locations/locations.service';
import { MarketplaceSearchDto, SearchSortOption } from '@paridhan/validation';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly locationsService: LocationsService,
  ) {}

  /**
   * Universal marketplace search across products and local clothing shops.
   */
  async searchMarketplace(dto: MarketplaceSearchDto, userId?: string) {
    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      this.locationsService.validateCoordinates(dto.latitude, dto.longitude);
    }

    const [productsResult, shopsResult] = await Promise.all([
      this.searchProducts(dto),
      this.searchShops(dto),
    ]);

    // Track search history if user is authenticated and query is non-empty
    if (userId && dto.query && dto.query.trim().length > 0) {
      try {
        await this.supabase.admin.from('search_history').insert({
          user_id: userId,
          query: dto.query.trim(),
          results_count: productsResult.total + shopsResult.total,
        });
      } catch {
        // Ignored in local dev
      }
    }

    return {
      products: productsResult,
      shops: shopsResult,
    };
  }

  /**
   * Search and filter product catalog with variant, distance, rating, price, and stock constraints.
   */
  async searchProducts(dto: MarketplaceSearchDto): Promise<PaginatedResult<any>> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;

    let query = this.supabase.admin
      .from('products')
      .select(
        '*, product_images(*), product_variants(*), shops(*), categories(id, name, slug)',
      )
      .eq('status', 'ACTIVE');

    if (dto.shopId) query = query.eq('shop_id', dto.shopId);
    if (dto.categoryId) query = query.eq('category_id', dto.categoryId);
    if (dto.subcategoryId) query = query.eq('subcategory_id', dto.subcategoryId);
    if (dto.brandId) query = query.eq('brand_id', dto.brandId);

    const { data: rawProducts, error } = await query;
    if (error) {
      this.logger.error(`Error querying products: ${error.message}`);
      throw new BadRequestException('Failed to execute search query');
    }

    let products = (rawProducts || []) as any[];

    // 1. Text Search (Matches title, description, shop name, category name)
    if (dto.query && dto.query.trim().length > 0) {
      const q = dto.query.toLowerCase().trim();
      const terms = q.split(/\s+/).filter(Boolean);

      products = products.filter((p) => {
        const title = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const shopName = (p.shops?.name || '').toLowerCase();
        const catName = (p.categories?.name || '').toLowerCase();

        return terms.every(
          (term) =>
            title.includes(term) ||
            desc.includes(term) ||
            shopName.includes(term) ||
            catName.includes(term),
        );
      });
    }

    // 2. Price Range Filter
    if (dto.minPrice !== undefined) {
      products = products.filter((p) => {
        const minVariantPrice = Math.min(
          p.base_price,
          ...(p.product_variants?.map((v: any) => v.price) || [p.base_price]),
        );
        return minVariantPrice >= dto.minPrice!;
      });
    }
    if (dto.maxPrice !== undefined) {
      products = products.filter((p) => {
        const minVariantPrice = Math.min(
          p.base_price,
          ...(p.product_variants?.map((v: any) => v.price) || [p.base_price]),
        );
        return minVariantPrice <= dto.maxPrice!;
      });
    }

    // 3. Variant Filter: Size
    if (dto.size) {
      const sizeTarget = dto.size.trim().toLowerCase();
      products = products.filter((p) =>
        p.product_variants?.some(
          (v: any) =>
            v.is_active &&
            v.size.trim().toLowerCase() === sizeTarget &&
            (!dto.inStockOnly || v.stock_quantity > 0),
        ),
      );
    }

    // 4. Variant Filter: Color
    if (dto.color) {
      const colorTarget = dto.color.trim().toLowerCase();
      products = products.filter((p) =>
        p.product_variants?.some(
          (v: any) =>
            v.is_active &&
            v.color.trim().toLowerCase() === colorTarget &&
            (!dto.inStockOnly || v.stock_quantity > 0),
        ),
      );
    }

    // 5. Stock Availability Filter
    if (dto.inStockOnly) {
      products = products.filter((p) =>
        p.product_variants?.some((v: any) => v.is_active && v.stock_quantity > 0),
      );
    }

    // 6. Bargaining Allowed Filter
    if (dto.isBargainingAllowed !== undefined) {
      products = products.filter(
        (p) =>
          p.is_bargaining_allowed === dto.isBargainingAllowed &&
          p.shops?.is_bargaining_enabled,
      );
    }

    // 7. Rating Filter
    if (dto.minRating !== undefined) {
      products = products.filter((p) => {
        const rating = p.rating || p.shops?.rating || 0;
        return rating >= dto.minRating!;
      });
    }

    // 8. Distance & Radius Filter
    const hasCoords = dto.latitude !== undefined && dto.longitude !== undefined;
    if (hasCoords) {
      const userLat = dto.latitude!;
      const userLng = dto.longitude!;
      const maxRadius = dto.radiusKm || 25;

      products = products
        .map((p) => {
          const shopLat = p.shops?.latitude;
          const shopLng = p.shops?.longitude;
          if (shopLat !== undefined && shopLng !== undefined) {
            const distanceKm = this.locationsService.calculateDistanceKm(
              userLat,
              userLng,
              shopLat,
              shopLng,
            );
            return { ...p, distanceKm };
          }
          return { ...p, distanceKm: 9999 };
        })
        .filter((p) => p.distanceKm <= maxRadius);
    }

    // 9. Sorting
    const sortBy: SearchSortOption = dto.sortBy || 'RELEVANCE';
    switch (sortBy) {
      case 'PRICE_ASC':
        products.sort((a, b) => a.base_price - b.base_price);
        break;
      case 'PRICE_DESC':
        products.sort((a, b) => b.base_price - a.base_price);
        break;
      case 'RATING_DESC':
        products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'DISTANCE_ASC':
        if (hasCoords) {
          products.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
        }
        break;
      case 'NEWEST':
        products.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        break;
      case 'RELEVANCE':
      default:
        // Default ranking: in stock, rating, and distance
        if (hasCoords) {
          products.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
        }
        break;
    }

    // 10. Pagination
    const total = products.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginatedData = products.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Search local clothing shops by name, description, city, and GPS proximity.
   */
  async searchShops(dto: MarketplaceSearchDto): Promise<PaginatedResult<any>> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;

    let query = this.supabase.admin
      .from('shops')
      .select('*, shop_images(*)')
      .eq('status', 'VERIFIED');

    const { data: rawShops, error } = await query;
    if (error) {
      this.logger.error(`Error querying shops: ${error.message}`);
      throw new BadRequestException('Failed to query shops');
    }

    let shops = (rawShops || []) as any[];

    // 1. Text Search
    if (dto.query && dto.query.trim().length > 0) {
      const q = dto.query.toLowerCase().trim();
      shops = shops.filter(
        (s) =>
          (s.name || '').toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q) ||
          (s.city || '').toLowerCase().includes(q),
      );
    }

    // 2. Bargaining Filter
    if (dto.isBargainingAllowed !== undefined) {
      shops = shops.filter((s) => s.is_bargaining_enabled === dto.isBargainingAllowed);
    }

    // 3. Rating Filter
    if (dto.minRating !== undefined) {
      shops = shops.filter((s) => (s.rating || 0) >= dto.minRating!);
    }

    // 4. Distance & Radius Filter
    const hasCoords = dto.latitude !== undefined && dto.longitude !== undefined;
    if (hasCoords) {
      const userLat = dto.latitude!;
      const userLng = dto.longitude!;
      const maxRadius = dto.radiusKm || 25;

      shops = shops
        .map((s) => ({
          ...s,
          distanceKm: this.locationsService.calculateDistanceKm(
            userLat,
            userLng,
            s.latitude,
            s.longitude,
          ),
        }))
        .filter((s) => s.distanceKm <= maxRadius)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    } else {
      shops.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const total = shops.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginatedData = shops.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
