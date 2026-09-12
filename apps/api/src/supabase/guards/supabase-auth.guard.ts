import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../supabase.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole, Database } from '@paridhan/types';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];

    // Validate Supabase JWT with Supabase Auth
    const { data: { user }, error } = await this.supabaseService.admin.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }

    // Fetch user profile & role from database
    const { data: profile } = await this.supabaseService.admin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const userProfile = profile as Database['public']['Tables']['users']['Row'] | null;
    const role: UserRole =
      userProfile?.role || (user.user_metadata?.role as UserRole) || 'CONSUMER';

    request.user = {
      id: user.id,
      email: user.email ?? '',
      phone: user.phone ?? null,
      fullName: userProfile?.full_name ?? user.user_metadata?.full_name ?? 'User',
      role,
      avatarUrl: userProfile?.avatar_url ?? null,
      isActive: userProfile?.is_active ?? true,
      createdAt: userProfile?.created_at ?? user.created_at,
      updatedAt: userProfile?.updated_at ?? user.updated_at ?? user.created_at,
    };

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(role);
      if (!hasRole) {
        throw new ForbiddenException(`Insufficient permissions for role: ${role}`);
      }
    }

    return true;
  }
}
