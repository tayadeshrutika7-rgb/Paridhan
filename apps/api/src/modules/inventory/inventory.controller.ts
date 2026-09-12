import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { SupabaseAuthGuard } from '../../supabase/guards/supabase-auth.guard';
import { RolesGuard } from '../../supabase/guards/roles.guard';
import { Roles } from '../../supabase/decorators/roles.decorator';
import { CurrentUser } from '../../supabase/decorators/current-user.decorator';
import { UserProfile } from '@paridhan/types';
import { InventoryAdjustmentDto } from '@paridhan/validation';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('SELLER', 'ADMIN')
@ApiBearerAuth('JWT-auth')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get current seller shop inventory levels with low-stock alerts' })
  async getShopInventory(@CurrentUser() user: UserProfile) {
    return this.inventoryService.getShopInventory(user.id);
  }

  @Post('adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Adjust variant stock level and log an audit movement' })
  @ApiResponse({ status: 200, description: 'Stock adjusted successfully' })
  async adjustStock(
    @CurrentUser() user: UserProfile,
    @Body() dto: InventoryAdjustmentDto,
  ) {
    return this.inventoryService.adjustStock(user.id, dto);
  }

  @Get('movements/:variantId')
  @ApiOperation({ summary: 'Get inventory movement audit history for a variant' })
  async getMovements(
    @CurrentUser() user: UserProfile,
    @Param('variantId') variantId: string,
  ) {
    return this.inventoryService.getVariantMovements(user.id, variantId);
  }
}
