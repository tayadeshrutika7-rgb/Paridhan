import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

export interface AiSearchProductsParams {
  query?: string;
  category?: string;
  maxPrice?: number;
  minPrice?: number;
  inStockOnly?: boolean;
}

export interface AiSearchShopsParams {
  query?: string;
  city?: string;
  verifiedOnly?: boolean;
}

export interface AiRecommendationParams {
  style?: string;
  occasion?: string;
  category?: string;
  preferredPriceMax?: number;
}

@Injectable()
export class AiService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Tool 1: Product Search Tool
   * Authoritative lookup from active marketplace catalog
   */
  async toolSearchProducts(params: AiSearchProductsParams) {
    let query = this.supabase.admin
      .from('products')
      .select(`
        id,
        name,
        slug,
        base_price,
        rating,
        description,
        is_bargaining_allowed,
        shop:shops(id, name, city, status),
        product_variants(id, sku, size, color, price, stock_quantity, is_active)
      `)
      .eq('status', 'ACTIVE');

    if (params.query) {
      query = query.ilike('name', `%${params.query.trim()}%`);
    }
    if (params.maxPrice != null) {
      query = query.lte('base_price', params.maxPrice);
    }
    if (params.minPrice != null) {
      query = query.gte('base_price', params.minPrice);
    }

    const { data, error } = await query.limit(10);
    if (error) throw error;

    let results = data || [];
    if (params.inStockOnly) {
      results = results.filter((p: any) =>
        (p.product_variants || []).some((v: any) => v.is_active && v.stock_quantity > 0),
      );
    }

    return {
      tool: 'product_search',
      count: results.length,
      products: results,
      notice: 'Data is real-time authoritative marketplace catalog state.',
    };
  }

  /**
   * Tool 2: Shop Search Tool
   * Discover verified local fashion shops
   */
  async toolSearchShops(params: AiSearchShopsParams) {
    let query = this.supabase.admin
      .from('shops')
      .select('id, name, description, city, address_line1, state, pincode, rating, status')
      .eq('status', params.verifiedOnly !== false ? 'VERIFIED' : 'VERIFIED');

    if (params.query) {
      query = query.ilike('name', `%${params.query.trim()}%`);
    }
    if (params.city) {
      query = query.ilike('city', `%${params.city.trim()}%`);
    }

    const { data, error } = await query.limit(10);
    if (error) throw error;

    return {
      tool: 'shop_search',
      count: data?.length || 0,
      shops: data || [],
      notice: 'Verified local partner shops.',
    };
  }

  /**
   * Tool 3: Product Lookup Tool
   * Retrieve authoritative details and variants for a specific product
   */
  async toolLookupProduct(productIdOrSlug: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      productIdOrSlug,
    );

    let query = this.supabase.admin
      .from('products')
      .select(`
        id,
        name,
        slug,
        description,
        base_price,
        rating,
        status,
        is_bargaining_allowed,
        shop:shops(id, name, city, address_line1, rating, status),
        product_variants(id, sku, size, color, price, stock_quantity, is_active),
        product_images(id, image_url, is_primary)
      `);

    if (isUuid) {
      query = query.eq('id', productIdOrSlug);
    } else {
      query = query.eq('slug', productIdOrSlug);
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) {
      throw new NotFoundException(`Product "${productIdOrSlug}" not found.`);
    }

    return {
      tool: 'product_lookup',
      product: data,
    };
  }

  /**
   * Tool 4: Variant Lookup Tool
   * Real-time SKU and inventory check
   */
  async toolLookupVariant(variantId: string) {
    const { data, error } = await this.supabase.admin
      .from('product_variants')
      .select('*, products(id, name, slug, base_price, status, shop_id)')
      .eq('id', variantId)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException(`Variant "${variantId}" not found.`);
    }

    return {
      tool: 'variant_lookup',
      variant: data,
      inStock: data.is_active && data.stock_quantity > 0,
    };
  }

  /**
   * Tool 5: Order Lookup Tool
   * Strict Authorization: Users can only lookup their own orders
   */
  async toolLookupOrder(orderIdOrNumber: string, userId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      orderIdOrNumber,
    );

    let query = this.supabase.admin
      .from('orders')
      .select(`
        id,
        order_number,
        user_id,
        status,
        payment_status,
        payment_method,
        total_amount,
        created_at,
        order_items(id, product_name, size, color, quantity, total_price),
        deliveries(id, status, estimated_delivery_time)
      `);

    if (isUuid) {
      query = query.eq('id', orderIdOrNumber);
    } else {
      query = query.eq('order_number', orderIdOrNumber);
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) {
      throw new NotFoundException(`Order "${orderIdOrNumber}" not found.`);
    }

    // Ownership authorization check
    if (data.user_id !== userId) {
      throw new ForbiddenException('You do not have permission to view this order.');
    }

    return {
      tool: 'order_lookup',
      order: data,
    };
  }

  /**
   * Tool 6: Fashion Recommendation Tool
   * Curates personalized suggestions based on style, occasion, or category
   */
  async toolGetRecommendations(params: AiRecommendationParams) {
    let query = this.supabase.admin
      .from('products')
      .select('id, name, slug, base_price, rating, description, shop:shops(name, city)')
      .eq('status', 'ACTIVE')
      .order('rating', { ascending: false });

    if (params.preferredPriceMax != null) {
      query = query.lte('base_price', params.preferredPriceMax);
    }

    const { data } = await query.limit(6);

    return {
      tool: 'fashion_recommendation',
      context: {
        style: params.style ?? 'trendy',
        occasion: params.occasion ?? 'casual',
      },
      recommendations: data || [],
      notice: 'Suggestions are advisory. Cart, bargaining, and checkout require client authorization.',
    };
  }

  /**
   * High-Level Conversational Flow
   * Dispatches to tools and returns structured natural language response with audit trail
   */
  async processFashionQuery(query: string, userId?: string) {
    const searchRes = await this.toolSearchProducts({ query });

    let conversationId: string | null = null;

    if (userId) {
      const { data: conv } = await this.supabase.admin
        .from('ai_conversations')
        .insert({ user_id: userId, session_title: query.slice(0, 50) })
        .select()
        .single();

      if (conv) {
        conversationId = conv.id;
        await this.supabase.admin.from('ai_messages').insert([
          { conversation_id: conv.id, role: 'user', content: query },
          {
            conversation_id: conv.id,
            role: 'assistant',
            content: `Found ${searchRes.products.length} local fashion items for "${query}".`,
            metadata: { products: searchRes.products },
          },
        ]);
      }
    }

    return {
      conversationId,
      answer: `Here are the top local options matching "${query}":`,
      recommendedProducts: searchRes.products,
      toolsUsed: ['product_search'],
      disclaimer: 'AI recommendations are informational only. All transactions are server-authoritative.',
    };
  }
}
