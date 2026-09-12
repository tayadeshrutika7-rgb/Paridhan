import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class LocationsService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Validates GPS coordinate bounds.
   */
  validateCoordinates(lat: number, lng: number): void {
    if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
      throw new BadRequestException('Invalid latitude: must be a number between -90 and 90');
    }
    if (typeof lng !== 'number' || isNaN(lng) || lng < -180 || lng > 180) {
      throw new BadRequestException('Invalid longitude: must be a number between -180 and 180');
    }
  }

  /**
   * Calculates Haversine distance in kilometers between two GPS coordinates.
   */
  calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    this.validateCoordinates(lat1, lon1);
    this.validateCoordinates(lat2, lon2);

    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Finds verified shops within a geographic radius ordered by distance.
   */
  async findNearbyShops(lat: number, lng: number, maxRadiusKm = 25, limit = 20) {
    this.validateCoordinates(lat, lng);

    if (maxRadiusKm <= 0) {
      throw new BadRequestException('Search radius must be greater than 0 km');
    }

    const { data: shops, error } = await this.supabase.admin
      .from('shops')
      .select('*, shop_images(*)')
      .eq('status', 'VERIFIED');

    if (error) throw error;

    return (shops || [])
      .map((shop) => ({
        ...shop,
        distanceKm: this.calculateDistanceKm(lat, lng, shop.latitude, shop.longitude),
      }))
      .filter((shop) => shop.distanceKm <= maxRadiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
  }
}

