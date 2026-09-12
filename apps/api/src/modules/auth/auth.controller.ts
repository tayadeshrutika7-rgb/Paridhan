import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard } from '../../supabase/guards/supabase-auth.guard';
import { CurrentUser } from '../../supabase/decorators/current-user.decorator';
import { UserProfile } from '@paridhan/types';
import {
  RegisterDto,
  LoginDto,
  PhoneOtpSendDto,
  PhoneOtpVerifyDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
} from '@paridhan/validation';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new Consumer or Seller account' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with Email and Password' })
  @ApiResponse({ status: 200, description: 'Authentication successful, returns tokens and user profile' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send SMS OTP for phone number login/signup' })
  async sendOtp(@Body() dto: PhoneOtpSendDto) {
    return this.authService.sendPhoneOtp(dto);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Phone SMS OTP' })
  async verifyOtp(@Body() dto: PhoneOtpVerifyDto) {
    return this.authService.verifyPhoneOtp(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh expired access token using refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshSession(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update password for authenticated user' })
  async resetPassword(
    @CurrentUser() user: UserProfile,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(user.id, dto);
  }

  @Post('logout')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out current session' })
  async logout(@Headers('authorization') authHeader: string) {
    const token = authHeader?.replace('Bearer ', '') || '';
    return this.authService.logout(token);
  }

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current authenticated user profile and addresses' })
  async getMe(@CurrentUser() user: UserProfile) {
    return this.authService.getMe(user.id);
  }

  @Post('sync-profile')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Sync OAuth profile metadata (e.g. Google Sign-In) to public.users' })
  async syncProfile(
    @CurrentUser() user: UserProfile,
    @Body() body: { fullName?: string; phone?: string; avatarUrl?: string },
  ) {
    return this.authService.syncUserProfile({
      id: user.id,
      email: user.email,
      fullName: body.fullName ?? user.fullName,
      phone: body.phone ?? user.phone,
      avatarUrl: body.avatarUrl ?? user.avatarUrl,
      role: user.role,
    });
  }
}
