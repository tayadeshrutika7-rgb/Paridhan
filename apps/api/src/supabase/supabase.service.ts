import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@paridhan/types';

class DummyWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  readyState = 3;
  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
}

if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = DummyWebSocket;
}

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private supabaseAdmin: SupabaseClient<Database>;
  private supabasePublic: SupabaseClient<Database>;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL', 'http://localhost:54321');
    const serviceRoleKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
      'dummy_service_role_key_for_backend_only',
    );
    const anonKey = this.configService.get<string>(
      'SUPABASE_ANON_KEY',
      'dummy_anon_key_for_local_development',
    );

    this.supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      realtime: {
        transport: DummyWebSocket as any,
      },
    });

    this.supabasePublic = createClient<Database>(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
      },
      realtime: {
        transport: DummyWebSocket as any,
      },
    });
    this.logger.log(`Initialized Supabase clients (Target URL: ${supabaseUrl})`);
  }

  /**
   * Returns authoritative Supabase client with service_role key for backend operations.
   */
  get admin(): SupabaseClient<Database> {
    return this.supabaseAdmin;
  }

  /**
   * Returns Supabase client with public anon key.
   */
  get client(): SupabaseClient<Database> {
    return this.supabasePublic;
  }

  /**
   * Validates database connectivity for health checks.
   */
  async checkHealth(): Promise<boolean> {
    try {
      const { error } = await this.supabaseAdmin.from('categories').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}
