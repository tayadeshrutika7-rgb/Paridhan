import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService, AiSearchProductsParams, AiSearchShopsParams, AiRecommendationParams } from './ai.service';
import { SupabaseAuthGuard } from '../../supabase/guards/supabase-auth.guard';

@ApiTags('AI Fashion Assistant')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Conversational natural language fashion discovery' })
  async chat(@Body() body: { query: string; userId?: string }, @Req() req: any) {
    const userId = req.user?.id || body.userId;
    return this.aiService.processFashionQuery(body.query, userId);
  }

  @Post('tools/search-products')
  @ApiOperation({ summary: 'AI Tool: Authoritative product search' })
  async toolSearchProducts(@Body() params: AiSearchProductsParams) {
    return this.aiService.toolSearchProducts(params);
  }

  @Post('tools/search-shops')
  @ApiOperation({ summary: 'AI Tool: Discover verified local shops' })
  async toolSearchShops(@Body() params: AiSearchShopsParams) {
    return this.aiService.toolSearchShops(params);
  }

  @Get('tools/lookup-product/:idOrSlug')
  @ApiOperation({ summary: 'AI Tool: Product lookup by ID or slug' })
  async toolLookupProduct(@Param('idOrSlug') idOrSlug: string) {
    return this.aiService.toolLookupProduct(idOrSlug);
  }

  @Get('tools/lookup-variant/:variantId')
  @ApiOperation({ summary: 'AI Tool: Variant SKU and inventory lookup' })
  async toolLookupVariant(@Param('variantId') variantId: string) {
    return this.aiService.toolLookupVariant(variantId);
  }

  @Get('tools/lookup-order/:orderIdOrNumber')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'AI Tool: Order lookup with strict ownership authorization' })
  async toolLookupOrder(@Param('orderIdOrNumber') orderIdOrNumber: string, @Req() req: any) {
    return this.aiService.toolLookupOrder(orderIdOrNumber, req.user.id);
  }

  @Post('tools/recommendations')
  @ApiOperation({ summary: 'AI Tool: Style and occasion-based fashion recommendations' })
  async toolGetRecommendations(@Body() params: AiRecommendationParams) {
    return this.aiService.toolGetRecommendations(params);
  }
}
