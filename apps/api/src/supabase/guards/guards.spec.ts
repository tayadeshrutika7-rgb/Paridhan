import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { RolesGuard } from './roles.guard';
import { SupabaseService } from '../supabase.service';

describe('Authentication & Authorization Guards (Phase 2)', () => {
  let authGuard: SupabaseAuthGuard;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  const mockSupabaseService = {
    admin: {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    },
  };

  const createMockContext = (headers: Record<string, string>, user?: any): ExecutionContext => {
    const request = {
      headers,
      user,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    reflector = new Reflector();
    authGuard = new SupabaseAuthGuard(mockSupabaseService as any, reflector);
    rolesGuard = new RolesGuard(reflector);
  });

  describe('SupabaseAuthGuard', () => {
    it('should throw UnauthorizedException if Authorization header is missing', async () => {
      const context = createMockContext({});
      await expect(authGuard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if Bearer prefix is missing', async () => {
      const context = createMockContext({ authorization: 'Basic 12345' });
      await expect(authGuard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if Supabase JWT is invalid or expired', async () => {
      mockSupabaseService.admin.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'jwt expired' },
      });

      const context = createMockContext({ authorization: 'Bearer expired-token' });
      await expect(authGuard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should populate req.user with authoritative database role and return true on valid token', async () => {
      mockSupabaseService.admin.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'usr-123',
            email: 'auth@example.com',
            created_at: '2026-09-08T00:00:00Z',
            user_metadata: {},
          },
        },
        error: null,
      });

      mockSupabaseService.admin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'usr-123',
                full_name: 'Verified User',
                role: 'SELLER',
                is_active: true,
              },
            }),
          }),
        }),
      });

      const context = createMockContext({ authorization: 'Bearer valid-jwt' });
      const canActivate = await authGuard.canActivate(context);

      expect(canActivate).toBe(true);
      const req = context.switchToHttp().getRequest();
      expect(req.user.id).toBe('usr-123');
      expect(req.user.role).toBe('SELLER');
      expect(req.user.fullName).toBe('Verified User');
    });
  });

  describe('RolesGuard', () => {
    it('should allow access if no roles are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockContext({}, { role: 'CONSUMER' });
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should allow access if user has the required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SELLER', 'ADMIN']);
      const context = createMockContext({}, { role: 'SELLER' });
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException if user lacks required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
      const context = createMockContext({}, { role: 'CONSUMER' });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user context is missing', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['CONSUMER']);
      const context = createMockContext({}, undefined);
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
