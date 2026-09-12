import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { SupabaseAuthGuard } from '../../supabase/guards/supabase-auth.guard';
import { Roles } from '../../supabase/decorators/roles.decorator';
import { CurrentUser } from '../../supabase/decorators/current-user.decorator';
import {
  ShopStatus,
  ProductStatus,
  UserRole,
  ComplaintStatus,
  OrderStatus,
  Json,
} from '@paridhan/types';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(SupabaseAuthGuard)
@Roles('ADMIN')
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // --- Metrics & Dashboard ---
  @Get('metrics')
  @ApiOperation({ summary: 'Get platform high-level metrics & analytics' })
  async getMetrics() {
    return this.adminService.getDashboardMetrics();
  }

  // --- Users Administration ---
  @Get('users')
  @ApiOperation({ summary: 'List platform users with filtering & pagination' })
  @ApiQuery({ name: 'role', required: false, enum: ['CONSUMER', 'SELLER', 'DELIVERY_PARTNER', 'ADMIN'] })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listUsers(
    @Query('role') role?: UserRole,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.listUsers({
      role,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details with shops & addresses' })
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update user platform role' })
  async updateUserRole(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body('role') role: UserRole,
  ) {
    return this.adminService.updateUserRole(adminId, id, role);
  }

  @Patch('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend or reactivate user account' })
  async setUserSuspension(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body('isSuspended') isSuspended: boolean,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.setUserSuspension(adminId, id, isSuspended, reason);
  }

  // --- Shops Verification ---
  @Get('shops')
  @ApiOperation({ summary: 'List platform shops with status filter' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listShops(
    @Query('status') status?: ShopStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.listShops({
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch('shops/:id/verify')
  @ApiOperation({ summary: 'Verify, reject, or suspend shop' })
  async verifyShop(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body('status') status: ShopStatus,
    @Body('rejectionReason') rejectionReason?: string,
  ) {
    return this.adminService.verifyShop(adminId, id, status, rejectionReason);
  }

  // --- Products Moderation ---
  @Get('products')
  @ApiOperation({ summary: 'List products with moderation status filter' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'PENDING_REVIEW', 'REJECTED', 'ARCHIVED'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listProducts(
    @Query('status') status?: ProductStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.listProducts({
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch('products/:id/moderate')
  @ApiOperation({ summary: 'Moderate product status' })
  async moderateProduct(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body('status') status: ProductStatus,
    @Body('moderationNotes') moderationNotes?: string,
  ) {
    return this.adminService.moderateProduct(adminId, id, status, moderationNotes);
  }

  // --- Orders Administration ---
  @Get('orders')
  @ApiOperation({ summary: 'List all orders on platform' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listOrders(
    @Query('status') status?: OrderStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.listOrders(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      status,
    );
  }

  @Patch('orders/:id/cancel')
  @ApiOperation({ summary: 'Privileged admin order cancellation with optional refund' })
  async cancelOrder(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('refundAmount') refundAmount?: number,
  ) {
    return this.adminService.privilegedCancelOrder(adminId, id, reason, refundAmount);
  }

  // --- Reviews Moderation ---
  @Get('reviews')
  @ApiOperation({ summary: 'List platform reviews' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listReviews(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.listReviews(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Delete('reviews/:id')
  @ApiOperation({ summary: 'Delete abusive or non-compliant review' })
  async deleteReview(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.deleteReview(adminId, id, reason);
  }

  // --- Complaints / Reports Management ---
  @Get('complaints')
  @ApiOperation({ summary: 'List customer/seller complaints' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'UNDER_INVESTIGATION', 'RESOLVED', 'DISMISSED'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listComplaints(
    @Query('status') status?: ComplaintStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.listComplaints({
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('complaints/:id')
  @ApiOperation({ summary: 'Get complaint details' })
  async getComplaintById(@Param('id') id: string) {
    return this.adminService.getComplaintById(id);
  }

  @Patch('complaints/:id/resolve')
  @ApiOperation({ summary: 'Resolve or dismiss a complaint' })
  async resolveComplaint(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body('status') status: ComplaintStatus,
    @Body('resolutionNotes') resolutionNotes: string,
  ) {
    return this.adminService.resolveComplaint(adminId, id, status, resolutionNotes);
  }

  // --- Platform Settings ---
  @Get('settings')
  @ApiOperation({ summary: 'Get platform-wide settings' })
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings/:key')
  @ApiOperation({ summary: 'Update a platform-wide setting' })
  async updateSetting(
    @CurrentUser('id') adminId: string,
    @Param('key') key: string,
    @Body('value') value: Json,
    @Body('description') description?: string,
  ) {
    return this.adminService.updateSetting(adminId, key, value, description);
  }

  // --- Audit Logs ---
  @Get('audit-logs')
  @ApiOperation({ summary: 'Query audit logs with filters' })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'entity', required: false })
  @ApiQuery({ name: 'actorId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getAuditLogs(
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('actorId') actorId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.auditLogsService.getLogs({
      action,
      entity,
      actorId,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }
}

