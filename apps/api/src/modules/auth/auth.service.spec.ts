import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';

describe('AuthService (Phase 2)', () => {
  let service: AuthService;

  const mockSupabaseService = {
    admin: {
      auth: {
        admin: {
          createUser: jest.fn(),
          updateUserById: jest.fn(),
        },
      },
      from: jest.fn(),
    },
    client: {
      auth: {
        signInWithPassword: jest.fn(),
        signInWithOtp: jest.fn(),
        verifyOtp: jest.fn(),
        refreshSession: jest.fn(),
        resetPasswordForEmail: jest.fn(),
        admin: {
          signOut: jest.fn(),
        },
      },
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new consumer user and create user profile + default cart/wishlist', async () => {
      mockSupabaseService.admin.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'usr-123' } },
        error: null,
      });

      const mockFrom = jest.fn((table: string) => {
        if (table === 'users') {
          return {
            upsert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'usr-123', email: 'test@example.com', role: 'CONSUMER' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          upsert: jest.fn().mockResolvedValue({ data: {}, error: null }),
        };
      });
      mockSupabaseService.admin.from = mockFrom as any;

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test Consumer',
        role: 'CONSUMER',
      });

      expect(result.message).toBe('User registered successfully');
      expect(result.user.id).toBe('usr-123');
      expect(mockSupabaseService.admin.auth.admin.createUser).toHaveBeenCalled();
    });

    it('should throw BadRequestException if Supabase Auth registration fails', async () => {
      mockSupabaseService.admin.auth.admin.createUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'User already exists' },
      });

      await expect(
        service.register({
          email: 'duplicate@example.com',
          password: 'password123',
          fullName: 'Duplicate User',
          role: 'CONSUMER',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should login with valid credentials and return tokens and authoritative profile', async () => {
      mockSupabaseService.client.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: 'valid-jwt-token',
            refresh_token: 'valid-refresh-token',
            expires_in: 3600,
          },
          user: { id: 'usr-123', email: 'test@example.com', user_metadata: {} },
        },
        error: null,
      });

      mockSupabaseService.admin.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'usr-123',
                full_name: 'Test Consumer',
                role: 'CONSUMER',
                is_active: true,
              },
            }),
          }),
        }),
      }) as any;

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('valid-jwt-token');
      expect(result.user.role).toBe('CONSUMER');
      expect(result.user.fullName).toBe('Test Consumer');
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      mockSupabaseService.client.auth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid login credentials' },
      });

      await expect(
        service.login({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject login if account is suspended', async () => {
      mockSupabaseService.client.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: { access_token: 'token', refresh_token: 'refresh', expires_in: 3600 },
          user: { id: 'usr-suspended', email: 'suspended@example.com' },
        },
        error: null,
      });

      mockSupabaseService.admin.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'usr-suspended',
                is_active: false,
              },
            }),
          }),
        }),
      }) as any;

      await expect(
        service.login({
          email: 'suspended@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('phone OTP', () => {
    it('should send phone OTP successfully', async () => {
      mockSupabaseService.client.auth.signInWithOtp.mockResolvedValue({ error: null });

      const result = await service.sendPhoneOtp({ phone: '+919876543210' });
      expect(result.phone).toBe('+919876543210');
      expect(mockSupabaseService.client.auth.signInWithOtp).toHaveBeenCalledWith({
        phone: '+919876543210',
      });
    });

    it('should verify OTP and return session', async () => {
      mockSupabaseService.client.auth.verifyOtp.mockResolvedValue({
        data: {
          session: { access_token: 'otp-jwt', refresh_token: 'otp-refresh', expires_in: 3600 },
          user: { id: 'usr-otp', phone: '+919876543210', user_metadata: {} },
        },
        error: null,
      });

      mockSupabaseService.admin.from = jest.fn().mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'usr-otp', phone: '+919876543210', role: 'CONSUMER' },
            }),
          }),
        }),
      }) as any;

      const result = await service.verifyPhoneOtp({
        phone: '+919876543210',
        token: '123456',
      });

      expect(result.accessToken).toBe('otp-jwt');
      expect(result.user.phone).toBe('+919876543210');
    });
  });

  describe('session refresh and logout', () => {
    it('should refresh session with valid refresh token', async () => {
      mockSupabaseService.client.auth.refreshSession.mockResolvedValue({
        data: {
          session: { access_token: 'new-jwt', refresh_token: 'new-refresh', expires_in: 3600 },
        },
        error: null,
      });

      const result = await service.refreshSession({ refreshToken: 'valid-refresh' });
      expect(result.accessToken).toBe('new-jwt');
    });

    it('should logout cleanly', async () => {
      const result = await service.logout('jwt-to-revoke');
      expect(result.message).toContain('Logged out');
    });
  });
});
