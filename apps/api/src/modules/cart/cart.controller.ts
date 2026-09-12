import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { SupabaseAuthGuard } from '../../supabase/guards/supabase-auth.guard';
import { CurrentUser } from '../../supabase/decorators/current-user.decorator';
import { UserProfile } from '@paridhan/types';
import { CartItemAddDto, CartItemUpdateDto } from '@paridhan/validation';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user cart with authoritative pricing, availability, and totals' })
  async getCart(@CurrentUser() user: UserProfile) {
    return this.cartService.getCartSummary(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add product variant to cart' })
  async addItem(
    @CurrentUser() user: UserProfile,
    @Body() body: CartItemAddDto,
  ) {
    return this.cartService.addItem(
      user.id,
      body.variantId,
      body.quantity,
      body.bargainingSessionId ?? undefined,
    );
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update cart item quantity' })
  async updateQuantity(
    @CurrentUser() user: UserProfile,
    @Param('id') id: string,
    @Body() body: CartItemUpdateDto,
  ) {
    return this.cartService.updateQuantity(user.id, id, body.quantity);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeItem(
    @CurrentUser() user: UserProfile,
    @Param('id') id: string,
  ) {
    return this.cartService.removeItem(user.id, id);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all items from user cart' })
  async clearCart(@CurrentUser() user: UserProfile) {
    return this.cartService.clearCart(user.id);
  }
}
