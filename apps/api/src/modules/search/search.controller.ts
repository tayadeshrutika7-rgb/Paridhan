import { Controller, Get, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { MarketplaceSearchDto, SearchSortOption } from '@paridhan/validation';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Universal search across products and local clothing shops' })
  @ApiQuery({ name: 'query', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'subcategoryId', required: false, type: String })
  @ApiQuery({ name: 'brandId', required: false, type: String })
  @ApiQuery({ name: 'shopId', required: false, type: String })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'size', required: false, type: String })
  @ApiQuery({ name: 'color', required: false, type: String })
  @ApiQuery({ name: 'minRating', required: false, type: Number })
  @ApiQuery({ name: 'inStockOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'isBargainingAllowed', required: false, type: Boolean })
  @ApiQuery({ name: 'latitude', required: false, type: Number })
  @ApiQuery({ name: 'longitude', required: false, type: Number })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['RELEVANCE', 'PRICE_ASC', 'PRICE_DESC', 'RATING_DESC', 'DISTANCE_ASC', 'NEWEST'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async search(
    @Query('query') query?: string,
    @Query('categoryId') categoryId?: string,
    @Query('subcategoryId') subcategoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('shopId') shopId?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('size') size?: string,
    @Query('color') color?: string,
    @Query('minRating') minRating?: number,
    @Query('inStockOnly') inStockOnly?: boolean,
    @Query('isBargainingAllowed') isBargainingAllowed?: boolean,
    @Query('latitude') latitude?: number,
    @Query('longitude') longitude?: number,
    @Query('radiusKm') radiusKm?: number,
    @Query('sortBy') sortBy?: SearchSortOption,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const dto: MarketplaceSearchDto = {
      query,
      categoryId,
      subcategoryId,
      brandId,
      shopId,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      size,
      color,
      minRating: minRating ? Number(minRating) : undefined,
      inStockOnly: inStockOnly !== undefined ? String(inStockOnly) === 'true' : false,
      isBargainingAllowed: isBargainingAllowed !== undefined ? String(isBargainingAllowed) === 'true' : undefined,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      radiusKm: radiusKm ? Number(radiusKm) : undefined,
      sortBy,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    };

    return this.searchService.searchMarketplace(dto);
  }

  @Get('products')
  @ApiOperation({ summary: 'Search and filter product catalog' })
  async searchProducts(@Query() query: any) {
    const dto: MarketplaceSearchDto = {
      query: query.query || query.search,
      categoryId: query.categoryId,
      subcategoryId: query.subcategoryId,
      brandId: query.brandId,
      shopId: query.shopId,
      minPrice: query.minPrice ? Number(query.minPrice) : undefined,
      maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
      size: query.size,
      color: query.color,
      minRating: query.minRating ? Number(query.minRating) : undefined,
      inStockOnly: query.inStockOnly !== undefined ? String(query.inStockOnly) === 'true' : false,
      isBargainingAllowed: query.isBargainingAllowed !== undefined ? String(query.isBargainingAllowed) === 'true' : undefined,
      latitude: query.latitude ? Number(query.latitude) : undefined,
      longitude: query.longitude ? Number(query.longitude) : undefined,
      radiusKm: query.radiusKm ? Number(query.radiusKm) : undefined,
      sortBy: query.sortBy,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    };

    return this.searchService.searchProducts(dto);
  }
}

