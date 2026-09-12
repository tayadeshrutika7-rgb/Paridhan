import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LocationsService } from './locations.service';

@ApiTags('Locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('nearby-shops')
  @ApiOperation({ summary: 'Find verified shops nearby GPS coordinates' })
  async getNearbyShops(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius?: number,
  ) {
    return this.locationsService.findNearbyShops(Number(lat), Number(lng), radius ? Number(radius) : 15);
  }
}
