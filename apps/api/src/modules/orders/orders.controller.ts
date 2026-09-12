import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { SupabaseAuthGuard } from '../../supabase/guards/supabase-auth.guard';
import { RolesGuard } from '../../supabase/guards/roles.guard';
import { CurrentUser } from '../../supabase/decorators/current-user.decorator';
import { UserProfile } from '@paridhan/types';
import { CheckoutDto, OrderStatusUpdateDto } from '@paridhan/validation';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Checkout current cart into a real order with atomic inventory reservation' })
  async checkout(
    @CurrentUser() user: UserProfile,
    @Body() body: CheckoutDto,
  ) {
    return this.ordersService.createCheckoutOrder(user.id, body);
  }

  @Get()
  @ApiOperation({ summary: 'Get current user/seller orders' })
  async getOrders(@CurrentUser() user: UserProfile) {
    if (user.role === 'SELLER') {
      return this.ordersService.listShopOrders(user.id);
    }
    return this.ordersService.listUserOrders(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details by ID with strict ownership validation' })
  async getOrderById(@CurrentUser() user: UserProfile, @Param('id') id: string) {
    return this.ordersService.getOrderById(id, user.id, user.role);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status with role permissions and state machine enforcement' })
  async updateStatus(
    @CurrentUser() user: UserProfile,
    @Param('id') id: string,
    @Body() body: OrderStatusUpdateDto,
  ) {
    return this.ordersService.updateOrderStatus(
      id,
      body.status,
      user.id,
      user.role,
      body.notes ?? undefined,
      body.cancellationReason ?? undefined,
    );
  }
}
