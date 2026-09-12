import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '@paridhan/types';
import {
  RegisterDto,
  LoginDto,
  PhoneOtpSendDto,
  PhoneOtpVerifyDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from '@paridhan/validation';

interface AuthContextType {
  user: UserProfile | null;
  session: any | null;
  isLoading: boolean;
  isConsumer: boolean;
  isSeller: boolean;
  isDeliveryPartner: boolean;
  isAdmin: boolean;
  login: (dto: LoginDto) => Promise<{ error?: string }>;
  register: (dto: RegisterDto) => Promise<{ error?: string }>;
  sendPhoneOtp: (dto: PhoneOtpSendDto) => Promise<{ error?: string }>;
  verifyPhoneOtp: (dto: PhoneOtpVerifyDto) => Promise<{ error?: string }>;
  forgotPassword: (dto: ForgotPasswordDto) => Promise<{ error?: string; message?: string }>;
  resetPassword: (dto: ResetPasswordDto) => Promise<{ error?: string; message?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string, authUser?: any) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setUser({
          id: data.id,
          email: data.email,
          fullName: data.full_name,
          phone: data.phone,
          role: data.role as UserRole,
          avatarUrl: data.avatar_url,
          isActive: data.is_active,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      } else if (authUser) {
        setUser({
          id: authUser.id,
          email: authUser.email ?? '',
          fullName: authUser.user_metadata?.full_name ?? 'Mobile User',
          phone: authUser.phone ?? null,
          role: (authUser.user_metadata?.role as UserRole) || 'CONSUMER',
          avatarUrl: null,
          isActive: true,
          createdAt: authUser.created_at,
          updatedAt: authUser.updated_at ?? authUser.created_at,
        });
      }
    } catch {
      // Offline / Local development fallback
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id, currentSession.user).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          await fetchProfile(newSession.user.id, newSession.user);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (dto: LoginDto) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || 'Login failed' };
    }
  };

  const register = async (dto: RegisterDto) => {
    try {
      const { error } = await supabase.auth.signUp({
        email: dto.email,
        password: dto.password,
        options: {
          data: {
            full_name: dto.fullName,
            role: dto.role || 'CONSUMER',
            phone: dto.phone,
          },
        },
      });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || 'Registration failed' };
    }
  };

  const sendPhoneOtp = async (dto: PhoneOtpSendDto) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: dto.phone,
      });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to send OTP' };
    }
  };

  const verifyPhoneOtp = async (dto: PhoneOtpVerifyDto) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: dto.phone,
        token: dto.token,
        type: 'sms',
      });
      if (error || !data.session) return { error: error?.message || 'Invalid OTP code' };
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to verify OTP' };
    }
  };

  const forgotPassword = async (dto: ForgotPasswordDto) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(dto.email);
      if (error) return { error: error.message };
      return { message: 'Password reset instructions sent.' };
    } catch (err: any) {
      return { error: err.message || 'Failed to request password reset' };
    }
  };

  const resetPassword = async (dto: ResetPasswordDto) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: dto.password,
      });
      if (error) return { error: error.message };
      return { message: 'Password updated successfully.' };
    } catch (err: any) {
      return { error: err.message || 'Failed to reset password' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchProfile(session.user.id, session.user);
    }
  };

  const role = user?.role || 'CONSUMER';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isConsumer: role === 'CONSUMER',
        isSeller: role === 'SELLER',
        isDeliveryPartner: role === 'DELIVERY_PARTNER',
        isAdmin: role === 'ADMIN',
        login,
        register,
        sendPhoneOtp,
        verifyPhoneOtp,
        forgotPassword,
        resetPassword,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

