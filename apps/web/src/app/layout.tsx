import type { Metadata } from 'next';
import './globals.css';
import { APP_CONFIG } from '@paridhan/config';
import { AuthProvider } from '../context/auth-context';
import { Navbar } from '../components/navbar';

export const metadata: Metadata = {
  title: `${APP_CONFIG.name} — ${APP_CONFIG.tagline}`,
  description: 'Discover nearby clothing shops, explore ethnic & modern fashion, negotiate fair prices, and support local clothing stores.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-stone-50 text-stone-900 antialiased">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>

          <footer className="bg-stone-900 text-stone-300 py-10 border-t border-stone-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left sm:flex sm:justify-between items-center">
              <div>
                <p className="text-lg font-bold text-white tracking-wide">{APP_CONFIG.name}</p>
                <p className="text-xs text-stone-400 mt-1">{APP_CONFIG.tagline}</p>
              </div>
              <p className="text-xs text-stone-500 mt-4 sm:mt-0">
                © {new Date().getFullYear()} {APP_CONFIG.name}. Built with Supabase & Next.js.
              </p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
