import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Retrieves clothing categories with subcategories.
   */
  async listCategories() {
    const { data, error } = await this.supabase.admin
      .from('categories')
      .select('*, subcategories(*)')
      .order('name');

    if (error) {
      this.logger.error(`Error listing categories: ${error.message}`);
      throw new BadRequestException('Failed to list categories');
    }

    return data;
  }

  /**
   * Retrieves all active clothing brands.
   */
  async listBrands() {
    const { data, error } = await this.supabase.admin
      .from('brands')
      .select('*')
      .order('name');

    if (error) {
      this.logger.error(`Error listing brands: ${error.message}`);
      throw new BadRequestException('Failed to list brands');
    }

    return data;
  }
}
