import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { Database } from '@paridhan/types';
import { UpdateProfileDto, AddressDto, UpdateAddressDto } from '@paridhan/validation';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Retrieves profile for the given user ID.
   */
  async getProfile(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException('User profile not found');
    }

    return data;
  }

  /**
   * Updates profile fields for the authenticated user.
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updatePayload: Database['public']['Tables']['users']['Update'] = {
      updated_at: new Date().toISOString(),
    };

    if (dto.fullName !== undefined) updatePayload.full_name = dto.fullName;
    if (dto.phone !== undefined) updatePayload.phone = dto.phone;
    if (dto.avatarUrl !== undefined) updatePayload.avatar_url = dto.avatarUrl;

    const { data, error } = await this.supabase.admin
      .from('users')
      .update(updatePayload)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error updating profile: ${error.message}`);
      throw new BadRequestException('Failed to update profile');
    }

    return data;
  }

  /**
   * Returns all addresses for the authenticated user.
   */
  async getUserAddresses(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Error fetching addresses: ${error.message}`);
      throw new BadRequestException('Failed to fetch addresses');
    }

    return data;
  }

  /**
   * Adds a new delivery address for the user.
   */
  async addAddress(userId: string, dto: AddressDto) {
    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.supabase.admin
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    const { data, error } = await this.supabase.admin
      .from('user_addresses')
      .insert({
        user_id: userId,
        label: dto.label,
        recipient_name: dto.recipientName,
        phone: dto.phone,
        address_line1: dto.addressLine1,
        address_line2: dto.addressLine2 ?? null,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        is_default: dto.isDefault ?? false,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error adding address: ${error.message}`);
      throw new BadRequestException('Failed to save address');
    }

    return data;
  }

  /**
   * Updates an address ensuring strict ownership verification.
   */
  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    // Verify ownership
    const { data: existing } = await this.supabase.admin
      .from('user_addresses')
      .select('id, user_id')
      .eq('id', addressId)
      .maybeSingle();

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    if (existing.user_id !== userId) {
      throw new ForbiddenException('You do not have permission to modify this address');
    }

    if (dto.isDefault) {
      await this.supabase.admin
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    const updateData: Database['public']['Tables']['user_addresses']['Update'] = {
      updated_at: new Date().toISOString(),
    };

    if (dto.label !== undefined) updateData.label = dto.label;
    if (dto.recipientName !== undefined) updateData.recipient_name = dto.recipientName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.addressLine1 !== undefined) updateData.address_line1 = dto.addressLine1;
    if (dto.addressLine2 !== undefined) updateData.address_line2 = dto.addressLine2;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.state !== undefined) updateData.state = dto.state;
    if (dto.pincode !== undefined) updateData.pincode = dto.pincode;
    if (dto.latitude !== undefined) updateData.latitude = dto.latitude;
    if (dto.longitude !== undefined) updateData.longitude = dto.longitude;
    if (dto.isDefault !== undefined) updateData.is_default = dto.isDefault;

    const { data, error } = await this.supabase.admin
      .from('user_addresses')
      .update(updateData)
      .eq('id', addressId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error updating address: ${error.message}`);
      throw new BadRequestException('Failed to update address');
    }

    return data;
  }

  /**
   * Deletes an address with ownership verification.
   */
  async deleteAddress(userId: string, addressId: string) {
    const { data: existing } = await this.supabase.admin
      .from('user_addresses')
      .select('id, user_id')
      .eq('id', addressId)
      .maybeSingle();

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    if (existing.user_id !== userId) {
      throw new ForbiddenException('You do not have permission to delete this address');
    }

    const { error } = await this.supabase.admin
      .from('user_addresses')
      .delete()
      .eq('id', addressId);

    if (error) {
      this.logger.error(`Error deleting address: ${error.message}`);
      throw new BadRequestException('Failed to delete address');
    }

    return { message: 'Address deleted successfully' };
  }

  /**
   * Sets the specified address as the default delivery address.
   */
  async setDefaultAddress(userId: string, addressId: string) {
    const { data: existing } = await this.supabase.admin
      .from('user_addresses')
      .select('id, user_id')
      .eq('id', addressId)
      .maybeSingle();

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    if (existing.user_id !== userId) {
      throw new ForbiddenException('You do not have permission to modify this address');
    }

    // Unset current defaults
    await this.supabase.admin
      .from('user_addresses')
      .update({ is_default: false })
      .eq('user_id', userId);

    // Set new default
    const { data, error } = await this.supabase.admin
      .from('user_addresses')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', addressId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to set default address');
    }

    return data;
  }
}
