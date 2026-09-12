'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/auth-context';

export default function OtpLoginPage() {
  const router = useRouter();
  const { sendPhoneOtp, verifyPhoneOtp } = useAuth();

  const [step, setStep] = useState<'send' | 'verify'>('send');
  const [phone, setPhone] = useState('+91');
  const [token, setToken] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    const res = await sendPhoneOtp({ phone });
    setIsSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(`OTP sent successfully to ${phone}`);
      setStep('verify');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    const res = await verifyPhoneOtp({ phone, token });
    setIsSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      router.push('/profile');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-stone-200 shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-stone-900 font-serif">Phone Sign-In</h2>
          <p className="mt-2 text-sm text-stone-600">
            {step === 'send'
              ? 'Enter your mobile number to receive a 6-digit OTP code'
              : `Enter the code sent to ${phone}`}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
            {successMsg}
          </div>
        )}

        {step === 'send' ? (
          <form className="mt-8 space-y-4" onSubmit={handleSendOtp}>
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm transition-all font-mono"
              />
              <p className="mt-1 text-xs text-stone-500">Include country code prefix (e.g. +91 for India)</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-sm transition-all disabled:opacity-50 text-sm"
            >
              {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleVerifyOtp}>
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                6-Digit OTP Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="123456"
                className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm transition-all text-center text-lg tracking-widest font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-sm transition-all disabled:opacity-50 text-sm"
            >
              {isSubmitting ? 'Verifying...' : 'Verify & Sign In'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('send');
                  setToken('');
                }}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium"
              >
                ← Change phone number
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-xs text-stone-600">
          Prefer standard sign-in?{' '}
          <Link href="/auth/login" className="font-semibold text-orange-600 hover:text-orange-700">
            Sign in with email
          </Link>
        </p>
      </div>
    </div>
  );
}
