import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { SupabaseAuthGuard } from '../../supabase/guards/supabase-auth.guard';
import { CurrentUser } from '../../supabase/decorators/current-user.decorator';
import { UserProfile } from '@paridhan/types';
import { WishlistToggleDto } from '@paridhan/validation';

@ApiTags('Wishlist')
@Controller('wishlist')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user wishlist items with availability' })
  async getWishlist(@CurrentUser() user: UserProfile) {
    return this.wishlistService.getWishlistItems(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add product to wishlist' })
  async addItem(
    @CurrentUser() user: UserProfile,
    @Body() body: WishlistToggleDto,
  ) {
    return this.wishlistService.addItem(user.id, body.productId);
  }

  @Post('toggle')
  @ApiOperation({ summary: 'Toggle product in wishlist' })
  async toggleItem(
    @CurrentUser() user: UserProfile,
    @Body() body: WishlistToggleDto,
  ) {
    return this.wishlistService.toggleItem(user.id, body.productId);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove product from wishlist' })
  async removeItem(
    @CurrentUser() user: UserProfile,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.removeItem(user.id, productId);
  }
}
