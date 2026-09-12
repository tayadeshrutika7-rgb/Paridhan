import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { HealthCheckResponse } from '@paridhan/types';
import { APP_CONFIG } from '@paridhan/config';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Platform Health Check' })
  @ApiResponse({ status: 200, description: 'Service is operational' })
  async checkHealth(): Promise<HealthCheckResponse> {
    const isDbHealthy = await this.supabaseService.checkHealth();
    const env = this.configService.get<string>('NODE_ENV', 'development');

    return {
      status: isDbHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      environment: env,
      version: APP_CONFIG.version,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      services: {
        database: isDbHealthy ? 'healthy' : 'unhealthy',
        redis: 'skipped',
      },
    };
  }
}
