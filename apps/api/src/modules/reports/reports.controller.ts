import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { SupabaseAuthGuard } from '../../supabase/guards/supabase-auth.guard';
import { Roles } from '../../supabase/decorators/roles.decorator';
import { CurrentUser } from '../../supabase/decorators/current-user.decorator';
import { UserProfile } from '@paridhan/types';

@ApiTags('Reports & Complaints')
@Controller('reports')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('complaints')
  @ApiOperation({ summary: 'Submit complaint or issue report' })
  async createComplaint(
    @CurrentUser() user: UserProfile,
    @Body() body: { subject: string; description: string; shopId?: string; orderId?: string },
  ) {
    return this.reportsService.createComplaint(user.id, body.subject, body.description, body.shopId, body.orderId);
  }

  @Get('complaints')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all platform complaints (Admin only)' })
  async listComplaints() {
    return this.reportsService.listComplaints();
  }
}
