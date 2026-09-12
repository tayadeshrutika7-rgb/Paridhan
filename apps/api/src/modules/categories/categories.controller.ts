import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all categories with subcategories' })
  async listCategories() {
    return this.categoriesService.listCategories();
  }

  @Get('brands')
  @ApiOperation({ summary: 'List all available brands' })
  async listBrands() {
    return this.categoriesService.listBrands();
  }
}
