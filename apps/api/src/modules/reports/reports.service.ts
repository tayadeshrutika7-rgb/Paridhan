import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class ReportsService {
  constructor(private readonly supabase: SupabaseService) {}

  async createComplaint(reporterId: string, subject: string, description: string, shopId?: string, orderId?: string) {
    const { data, error } = await this.supabase.admin
      .from('complaints')
      .insert({
        reporter_id: reporterId,
        subject,
        description,
        shop_id: shopId ?? null,
        order_id: orderId ?? null,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async listComplaints() {
    const { data, error } = await this.supabase.admin
      .from('complaints')
      .select('*, reporter:users(full_name, email), shops(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}
