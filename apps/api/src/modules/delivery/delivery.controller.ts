import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import { SupabaseAuthGuard } from '../../supabase/guards/supabase-auth.guard';
import { RolesGuard } from '../../supabase/guards/roles.guard';
import { Roles } from '../../supabase/decorators/roles.decorator';
import { CurrentUser } from '../../supabase/decorators/current-user.decorator';
import { UserProfile, DeliveryStatus } from '@paridhan/types';
import {
  DeliveryAssignDto,
  DeliveryConfirmPickupDto,
  DeliveryConfirmDeliveryDto,
  DeliveryFailureReportDto,
} from '@paridhan/validation';

@ApiTags('Delivery')
@Controller('delivery')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post('assign')
  @Roles('SELLER', 'ADMIN')
  @ApiOperation({ summary: 'Assign delivery partner to confirmed order with generated OTPs' })
  async assignDelivery(
    @CurrentUser() user: UserProfile,
    @Body() body: DeliveryAssignDto,
  ) {
    return this.deliveryService.assignDeliveryPartner(body, user.id, user.role);
  }

  @Get('assigned')
  @Roles('DELIVERY_PARTNER', 'ADMIN')
  @ApiOperation({ summary: 'Get active assigned deliveries for delivery partner with privacy masking' })
  async getAssigned(@CurrentUser() user: UserProfile) {
    return this.deliveryService.getAssignedDeliveries(user.id);
  }

  @Get('history')
  @Roles('DELIVERY_PARTNER', 'ADMIN')
  @ApiOperation({ summary: 'Get completed delivery history for delivery partner' })
  async getHistory(@CurrentUser() user: UserProfile) {
    return this.deliveryService.getDeliveryHistory(user.id);
  }

  @Get(':id')
  @Roles('DELIVERY_PARTNER', 'ADMIN', 'SELLER', 'CONSUMER')
  @ApiOperation({ summary: 'Get single delivery assignment details with Google Maps navigation' })
  async getDelivery(@CurrentUser() user: UserProfile, @Param('id') id: string) {
    return this.deliveryService.getDeliveryById(id, user.id, user.role);
  }

  @Post(':id/accept')
  @Roles('DELIVERY_PARTNER', 'ADMIN')
  @ApiOperation({ summary: 'Delivery partner accepts assignment' })
  async acceptDelivery(
    @CurrentUser() user: UserProfile,
    @Param('id') id: string,
  ) {
    return this.deliveryService.acceptDelivery(id, user.id);
  }

  @Post(':id/confirm-pickup')
  @Roles('DELIVERY_PARTNER', 'ADMIN')
  @ApiOperation({ summary: 'Confirm shop order pickup with 4-digit pickup OTP' })
  async confirmPickup(
    @CurrentUser() user: UserProfile,
    @Param('id') id: string,
    @Body() body: DeliveryConfirmPickupDto,
  ) {
    return this.deliveryService.confirmPickup(id, user.id, body);
  }

  @Post(':id/out-for-delivery')
  @Roles('DELIVERY_PARTNER', 'ADMIN')
  @ApiOperation({ summary: 'Start transit to customer destination' })
  async startDelivery(
    @CurrentUser() user: UserProfile,
    @Param('id') id: string,
  ) {
    return this.deliveryService.startDelivery(id, user.id);
  }

  @Post(':id/confirm-delivery')
  @Roles('DELIVERY_PARTNER', 'ADMIN')
  @ApiOperation({ summary: 'Confirm customer handover with 4-digit delivery OTP' })
  async confirmDelivery(
    @CurrentUser() user: UserProfile,
    @Param('id') id: string,
    @Body() body: DeliveryConfirmDeliveryDto,
  ) {
    return this.deliveryService.confirmDelivery(id, user.id, body);
  }

  @Post(':id/failure')
  @Roles('DELIVERY_PARTNER', 'ADMIN')
  @ApiOperation({ summary: 'Report delivery failure with reason' })
  async reportFailure(
    @CurrentUser() user: UserProfile,
    @Param('id') id: string,
    @Body() body: DeliveryFailureReportDto,
  ) {
    return this.deliveryService.reportDeliveryFailure(id, user.id, body);
  }

  @Patch(':id/status')
  @Roles('DELIVERY_PARTNER', 'ADMIN')
  @ApiOperation({ summary: 'Update delivery status with location and notes' })
  async updateStatus(
    @CurrentUser() user: UserProfile,
    @Param('id') id: string,
    @Body() body: { status: DeliveryStatus; latitude?: number; longitude?: number; notes?: string },
  ) {
    return this.deliveryService.updateDeliveryStatus(
      id,
      body.status,
      user.id,
      user.role,
      body.latitude,
      body.longitude,
      body.notes,
    );
  }
}
