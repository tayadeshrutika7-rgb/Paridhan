import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { UserRole, Database } from '@paridhan/types';
import {
  RegisterDto,
  LoginDto,
  PhoneOtpSendDto,
  PhoneOtpVerifyDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
} from '@paridhan/validation';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Registers a new user with Supabase Auth and creates their application profile.
   */
  async register(dto: RegisterDto) {
    const role: UserRole = dto.role || 'CONSUMER';

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } =
      await this.supabaseService.admin.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        phone: dto.phone ?? undefined,
        email_confirm: true,
        phone_confirm: !!dto.phone,
        user_metadata: {
          full_name: dto.fullName,
          role,
        },
      });

    if (authError || !authData.user) {
      this.logger.error(`Registration failed: ${authError?.message}`);
      throw new BadRequestException(authError?.message || 'Failed to create user account');
    }

    const userId = authData.user.id;

    // 2. Synchronize to public.users table
    const { data: userProfile, error: profileError } = await this.supabaseService.admin
      .from('users')
      .upsert({
        id: userId,
        email: dto.email,
        full_name: dto.fullName,
        phone: dto.phone ?? null,
        role,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (profileError) {
      this.logger.error(`Error saving user profile: ${profileError.message}`);
      throw new BadRequestException('Account created but failed to initialize profile');
    }

    // 3. Initialize default consumer resources (Cart and Wishlist)
    if (role === 'CONSUMER') {
      await this.supabaseService.admin.from('carts').upsert({ user_id: userId });
      await this.supabaseService.admin.from('wishlists').upsert({ user_id: userId });
    }

    return {
      message: 'User registered successfully',
      user: userProfile,
    };
  }

  /**
   * Authenticates user via email and password using Supabase Auth.
   */
  async login(dto: LoginDto) {
    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session || !data.user) {
      this.logger.warn(`Failed login attempt for ${dto.email}: ${error?.message}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Retrieve authoritative profile from public.users
    const { data: profile } = await this.supabaseService.admin
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    const userProfile = profile as Database['public']['Tables']['users']['Row'] | null;

    if (userProfile && !userProfile.is_active) {
      throw new UnauthorizedException('Account has been suspended. Please contact support.');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      tokenType: 'Bearer',
      user: {
        id: data.user.id,
        email: data.user.email ?? '',
        fullName: userProfile?.full_name ?? data.user.user_metadata?.full_name ?? 'User',
        phone: userProfile?.phone ?? data.user.phone ?? null,
        role: (userProfile?.role ?? data.user.user_metadata?.role ?? 'CONSUMER') as UserRole,
        avatarUrl: userProfile?.avatar_url ?? null,
        isActive: userProfile?.is_active ?? true,
      },
    };
  }

  /**
   * Sends a phone SMS OTP for passwordless login/signup.
   */
  async sendPhoneOtp(dto: PhoneOtpSendDto) {
    const { error } = await this.supabaseService.client.auth.signInWithOtp({
      phone: dto.phone,
    });

    if (error) {
      this.logger.error(`Failed to send SMS OTP: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to send OTP');
    }

    return {
      message: 'OTP sent successfully to ' + dto.phone,
      phone: dto.phone,
    };
  }

  /**
   * Verifies Phone SMS OTP and creates or returns the authenticated session.
   */
  async verifyPhoneOtp(dto: PhoneOtpVerifyDto) {
    const { data, error } = await this.supabaseService.client.auth.verifyOtp({
      phone: dto.phone,
      token: dto.token,
      type: 'sms',
    });

    if (error || !data.session || !data.user) {
      throw new UnauthorizedException('Invalid or expired OTP token');
    }

    // Ensure profile exists in public.users
    const role: UserRole = dto.role || 'CONSUMER';
    const { data: profile } = await this.supabaseService.admin
      .from('users')
      .upsert({
        id: data.user.id,
        email: data.user.email ?? `${dto.phone.replace('+', '')}@paridhan.local`,
        full_name: dto.fullName ?? data.user.user_metadata?.full_name ?? 'Mobile User',
        phone: dto.phone,
        role,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      tokenType: 'Bearer',
      user: profile,
    };
  }

  /**
   * Refreshes an expired access token using a valid refresh token.
   */
  async refreshSession(dto: RefreshTokenDto) {
    const { data, error } = await this.supabaseService.client.auth.refreshSession({
      refresh_token: dto.refreshToken,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      tokenType: 'Bearer',
    };
  }

  /**
   * Sends password reset email instructions.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const { error } = await this.supabaseService.client.auth.resetPasswordForEmail(dto.email);

    if (error) {
      this.logger.warn(`Password reset request error: ${error.message}`);
    }

    return {
      message: 'If the email exists in our system, password reset instructions have been sent.',
    };
  }

  /**
   * Resets password for authenticated user or token holder.
   */
  async resetPassword(userId: string, dto: ResetPasswordDto) {
    const { error } = await this.supabaseService.admin.auth.admin.updateUserById(userId, {
      password: dto.password,
    });

    if (error) {
      throw new BadRequestException(`Failed to reset password: ${error.message}`);
    }

    return {
      message: 'Password has been updated successfully.',
    };
  }

  /**
   * Invalidates active session / signs out.
   */
  async logout(token?: string) {
    try {
      if (token && this.supabaseService.client.auth.admin?.signOut) {
        await this.supabaseService.client.auth.admin.signOut(token);
      } else {
        await this.supabaseService.client.auth.signOut();
      }
    } catch {
      // Ignored for session cleanup
    }
    return {
      message: 'Logged out successfully.',
    };
  }

  /**
   * Retrieves profile, role, and address metadata for the currently authenticated user.
   */
  async getMe(userId: string) {
    const { data: user, error: userError } = await this.supabaseService.admin
      .from('users')
      .select('*, addresses(*)')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      throw new NotFoundException('User profile not found');
    }

    return user;
  }

  /**
   * Synchronizes user metadata from external OAuth (e.g. Google sign-in) to public.users.
   */
  async syncUserProfile(user: {
    id: string;
    email: string;
    fullName: string;
    phone?: string | null;
    avatarUrl?: string | null;
    role?: UserRole;
  }) {
    const { data, error } = await this.supabaseService.admin
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        phone: user.phone ?? null,
        avatar_url: user.avatarUrl ?? null,
        role: user.role ?? 'CONSUMER',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error syncing user profile: ${error.message}`);
      throw new BadRequestException('Failed to synchronize user profile');
    }

    return data;
  }
}
