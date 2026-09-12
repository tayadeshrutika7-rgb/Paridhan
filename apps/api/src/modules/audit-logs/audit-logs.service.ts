import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { Json } from '@paridhan/types';

export interface AuditLogQueryFilters {
  action?: string;
  entity?: string;
  actorId?: string;
  entityId?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly supabase: SupabaseService) {}

  async logAction(action: string, entity: string, actorId?: string, entityId?: string, metadata?: Json) {
    const { error } = await this.supabase.admin.from('audit_logs').insert({
      action,
      entity,
      actor_id: actorId ?? null,
      entity_id: entityId ?? null,
      metadata: metadata ?? null,
    });
    if (error) throw error;
  }

  async getLogs(filters?: AuditLogQueryFilters) {
    let query = this.supabase.admin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.action) {
      query = query.eq('action', filters.action);
    }
    if (filters?.entity) {
      query = query.eq('entity', filters.entity);
    }
    if (filters?.actorId) {
      query = query.eq('actor_id', filters.actorId);
    }
    if (filters?.entityId) {
      query = query.eq('entity_id', filters.entityId);
    }

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }
}

