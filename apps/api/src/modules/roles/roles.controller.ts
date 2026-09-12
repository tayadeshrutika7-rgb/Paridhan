import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { SupabaseAuthGuard } from '../../supabase/guards/supabase-auth.guard';
import { Roles } from '../../supabase/decorators/roles.decorator';

@ApiTags('Roles & Permissions')
@Controller('roles')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth('JWT-auth')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List platform roles and permissions (Admin only)' })
  async getRoles() {
    return this.rolesService.getRoles();
  }
}
