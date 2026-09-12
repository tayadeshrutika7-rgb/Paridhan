import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { SupabaseAuthGuard } from '../../supabase/guards/supabase-auth.guard';
import { Roles } from '../../supabase/decorators/roles.decorator';

@ApiTags('Audit Logs')
@Controller('audit-logs')
@UseGuards(SupabaseAuthGuard)
@Roles('ADMIN')
@ApiBearerAuth('JWT-auth')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Get system audit log activity (Admin only)' })
  async getLogs(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
  ) {
    return this.auditLogsService.getLogs({
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
      action,
      entity,
    });
  }
}
