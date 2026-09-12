'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : undefined,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setMessage('Password reset link has been dispatched to your email address.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to request password reset');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl border border-stone-200 shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-stone-900 font-serif">Reset Password</h2>
          <p className="mt-2 text-sm text-stone-600">
            Enter your email to receive recovery instructions
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {errorMsg}
          </div>
        )}

        {message && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
            {message}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-sm transition-all disabled:opacity-50 text-sm"
          >
            {isSubmitting ? 'Sending instructions...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="text-center text-xs text-stone-600">
          Remembered your password?{' '}
          <Link href="/auth/login" className="font-semibold text-orange-600 hover:text-orange-700">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
