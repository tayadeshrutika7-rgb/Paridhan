import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getProductReviews(productId: string) {
    const { data, error } = await this.supabase.admin
      .from('reviews')
      .select('*, users(full_name, avatar_url)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async createReview(userId: string, productId: string, shopId: string, rating: number, comment?: string, title?: string) {
    const { data, error } = await this.supabase.admin
      .from('reviews')
      .insert({
        user_id: userId,
        product_id: productId,
        shop_id: shopId,
        rating,
        comment: comment ?? null,
        title: title ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
