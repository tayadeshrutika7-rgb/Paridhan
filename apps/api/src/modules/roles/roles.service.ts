import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class RolesService {
  constructor(private readonly supabase: SupabaseService) {}

  async getRoles() {
    const { data, error } = await this.supabase.admin
      .from('roles')
      .select('*, permissions:role_permissions(permission_id, permissions(*))');
    if (error) throw error;
    return data;
  }
}
