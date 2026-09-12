import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ShopsService } from './shops.service';
import { SupabaseAuthGuard } from '../../supabase/guards/supabase-auth.guard';
import { RolesGuard } from '../../supabase/guards/roles.guard';
import { Roles } from '../../supabase/decorators/roles.decorator';
import { CurrentUser } from '../../supabase/decorators/current-user.decorator';
import { UserProfile } from '@paridhan/types';
import { ShopCreateDto, ShopUpdateDto } from '@paridhan/validation';

@ApiTags('Shops')
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  @ApiOperation({ summary: 'List all verified local clothing shops' })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'search', required: false })
  async listShops(
    @Query('city') city?: string,
    @Query('search') search?: string,
  ) {
    return this.shopsService.listShops(city, search);
  }

  @Get('my-shop')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current seller shop details' })
  async getMyShop(@CurrentUser() user: UserProfile) {
    return this.shopsService.getSellerShop(user.id);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new seller shop' })
  @ApiResponse({ status: 201, description: 'Shop created successfully' })
  async createShop(
    @CurrentUser() user: UserProfile,
    @Body() dto: ShopCreateDto,
  ) {
    return this.shopsService.createShop(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update shop details' })
  async updateShop(
    @CurrentUser() user: UserProfile,
    @Param('id') shopId: string,
    @Body() dto: ShopUpdateDto,
  ) {
    return this.shopsService.updateShop(user.id, shopId, dto);
  }

  @Post(':id/images')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add a gallery image to the shop' })
  async addImage(
    @CurrentUser() user: UserProfile,
    @Param('id') shopId: string,
    @Body() body: { imageUrl: string; displayOrder?: number },
  ) {
    return this.shopsService.addShopImage(user.id, shopId, body.imageUrl, body.displayOrder ?? 0);
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get shop profile with active products by ID or Slug' })
  async getShop(@Param('idOrSlug') idOrSlug: string) {
    return this.shopsService.getShopByIdOrSlug(idOrSlug);
  }
}
