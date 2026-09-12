'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/auth-context';
import { APP_CONFIG } from '@paridhan/config';

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight text-orange-600 font-serif">
              {APP_CONFIG.name}
            </span>
          </Link>
          <span className="hidden md:inline-block text-[11px] uppercase tracking-wider text-stone-500 font-semibold px-2 py-0.5 bg-stone-100 rounded-full border border-stone-200">
            {APP_CONFIG.tagline}
          </span>
        </div>

        {/* 4 Role Interfaces Switcher Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg text-stone-700 hover:text-orange-600 hover:bg-orange-50/60 transition-all flex items-center gap-1"
          >
            <span>🛍️</span>
            <span className="hidden sm:inline">Consumer</span>
          </Link>

          <Link
            href="/seller"
            className="px-3 py-1.5 rounded-lg text-stone-700 hover:text-orange-600 hover:bg-orange-50/60 transition-all flex items-center gap-1"
          >
            <span>🏪</span>
            <span className="hidden sm:inline">Seller</span>
          </Link>

          <Link
            href="/delivery"
            className="px-3 py-1.5 rounded-lg text-stone-700 hover:text-emerald-700 hover:bg-emerald-50/60 transition-all flex items-center gap-1"
          >
            <span>🚚</span>
            <span className="hidden sm:inline">Delivery</span>
          </Link>

          <Link
            href="/admin"
            className="px-3 py-1.5 rounded-lg text-stone-700 hover:text-indigo-700 hover:bg-indigo-50/60 transition-all flex items-center gap-1"
          >
            <span>🛡️</span>
            <span className="hidden sm:inline">Admin</span>
          </Link>

          {/* User Profile / Auth */}
          <div className="ml-2 pl-2 border-l border-stone-200 flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 text-orange-900 rounded-lg text-xs font-bold border border-orange-200"
                >
                  <span>{user.fullName || user.email?.split('@')[0]}</span>
                  <span className="px-1 py-0.2 bg-orange-200 rounded text-[9px] uppercase font-mono">
                    {user.role}
                  </span>
                </Link>
                <button
                  onClick={() => logout()}
                  className="text-xs text-stone-500 hover:text-stone-900 font-medium px-2 py-1"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/auth/login"
                  className="px-3 py-1.5 text-stone-700 hover:text-orange-600 text-xs font-semibold"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow-sm"
                >
                  Join
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
