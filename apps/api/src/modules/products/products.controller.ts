import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { SupabaseAuthGuard } from '../../supabase/guards/supabase-auth.guard';
import { RolesGuard } from '../../supabase/guards/roles.guard';
import { Roles } from '../../supabase/decorators/roles.decorator';
import { CurrentUser } from '../../supabase/decorators/current-user.decorator';
import { UserProfile } from '@paridhan/types';
import {
  ProductCreateDto,
  ProductUpdateDto,
  ProductVariantCreateDto,
  ProductVariantUpdateDto,
} from '@paridhan/validation';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List and filter catalog products' })
  @ApiQuery({ name: 'shopId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'subcategoryId', required: false })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'inStockOnly', required: false, type: Boolean })
  async listProducts(
    @Query('shopId') shopId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('subcategoryId') subcategoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('search') search?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('inStockOnly') inStockOnly?: boolean,
  ) {
    return this.productsService.listProducts({
      shopId,
      categoryId,
      subcategoryId,
      brandId,
      search,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      inStockOnly: inStockOnly !== undefined ? String(inStockOnly) === 'true' : undefined,
    });
  }

  @Post()
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new product with variants and images' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  async createProduct(
    @CurrentUser() user: UserProfile,
    @Body() dto: ProductCreateDto,
  ) {
    return this.productsService.createProduct(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update product metadata' })
  async updateProduct(
    @CurrentUser() user: UserProfile,
    @Param('id') productId: string,
    @Body() dto: ProductUpdateDto,
  ) {
    return this.productsService.updateProduct(user.id, productId, dto);
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive product' })
  async archiveProduct(
    @CurrentUser() user: UserProfile,
    @Param('id') productId: string,
  ) {
    return this.productsService.archiveProduct(user.id, productId);
  }

  @Post(':id/variants')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add a new variant (size/color) to an existing product' })
  async addVariant(
    @CurrentUser() user: UserProfile,
    @Param('id') productId: string,
    @Body() dto: ProductVariantCreateDto,
  ) {
    return this.productsService.addVariant(user.id, productId, dto);
  }

  @Patch('variants/:variantId')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update variant pricing or status' })
  async updateVariant(
    @CurrentUser() user: UserProfile,
    @Param('variantId') variantId: string,
    @Body() dto: ProductVariantUpdateDto,
  ) {
    return this.productsService.updateVariant(user.id, variantId, dto);
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get single product details with active variants, images, and shop info' })
  async getProduct(@Param('idOrSlug') idOrSlug: string) {
    return this.productsService.getProductByIdOrSlug(idOrSlug);
  }
}
