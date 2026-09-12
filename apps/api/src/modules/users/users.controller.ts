import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { SupabaseAuthGuard } from '../../supabase/guards/supabase-auth.guard';
import { CurrentUser } from '../../supabase/decorators/current-user.decorator';
import { UserProfile } from '@paridhan/types';
import { UpdateProfileDto, AddressDto, UpdateAddressDto } from '@paridhan/validation';

@ApiTags('Users')
@Controller('users')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: UserProfile) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update profile details for the authenticated user' })
  async updateProfile(
    @CurrentUser() user: UserProfile,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('addresses')
  @ApiOperation({ summary: 'List all saved delivery addresses for the user' })
  async getAddresses(@CurrentUser() user: UserProfile) {
    return this.usersService.getUserAddresses(user.id);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Add a new delivery address' })
  @ApiResponse({ status: 201, description: 'Address created successfully' })
  async addAddress(
    @CurrentUser() user: UserProfile,
    @Body() dto: AddressDto,
  ) {
    return this.usersService.addAddress(user.id, dto);
  }

  @Patch('addresses/:id')
  @ApiOperation({ summary: 'Update an existing delivery address' })
  async updateAddress(
    @CurrentUser() user: UserProfile,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(user.id, addressId, dto);
  }

  @Delete('addresses/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a delivery address' })
  async deleteAddress(
    @CurrentUser() user: UserProfile,
    @Param('id') addressId: string,
  ) {
    return this.usersService.deleteAddress(user.id, addressId);
  }

  @Post('addresses/:id/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set an address as the default delivery address' })
  async setDefaultAddress(
    @CurrentUser() user: UserProfile,
    @Param('id') addressId: string,
  ) {
    return this.usersService.setDefaultAddress(user.id, addressId);
  }
}
