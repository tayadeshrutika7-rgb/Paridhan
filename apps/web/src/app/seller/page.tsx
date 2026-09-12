'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/auth-context';
import { supabase } from '../../lib/supabase';
import { ProtectedRoute } from '../../components/auth/protected-route';

export default function SellerDashboardPage() {
  const { user } = useAuth();
  const [shop, setShop] = useState<any | null>(null);
  const [productCount, setProductCount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadSellerStats();
    }
  }, [user]);

  const loadSellerStats = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch shop
      const { data: shopData } = await supabase
        .from('shops')
        .select('*')
        .eq('seller_id', user!.id)
        .maybeSingle();

      setShop(shopData);

      if (shopData) {
        // 2. Fetch products count
        const { count: prodCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('shop_id', shopData.id)
          .eq('status', 'ACTIVE');

        setProductCount(prodCount || 0);

        // 3. Fetch low stock count
        const { data: variants } = await supabase
          .from('product_variants')
          .select('stock_quantity, products!inner(shop_id)')
          .eq('products.shop_id', shopData.id);

        const lowStock = (variants || []).filter((v: any) => v.stock_quantity <= 5).length;
        setLowStockCount(lowStock);
      }
    } catch {
      // Ignore in offline dev
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['SELLER', 'ADMIN']}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-stone-900 font-serif">
              Seller Portal
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Manage your local boutique, catalog variants, stock levels, and bargaining
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/seller/products/new"
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl text-sm shadow-sm transition-all"
            >
              + Add Product
            </Link>
            <Link
              href="/seller/shop"
              className="px-4 py-2.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-medium rounded-xl text-sm transition-all"
            >
              Manage Shop
            </Link>
          </div>
        </div>

        {/* Shop Status Banner */}
        {isLoading ? (
          <div className="p-8 text-center text-stone-500 font-medium">Loading store information...</div>
        ) : !shop ? (
          <div className="p-8 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-4">
            <h2 className="text-xl font-bold text-amber-900 font-serif">You haven&apos;t set up your shop yet</h2>
            <p className="text-sm text-amber-700 max-w-md mx-auto">
              Create your local physical clothing shop profile to start publishing products and accepting orders.
            </p>
            <Link
              href="/seller/shop"
              className="inline-block px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm shadow-sm transition-all"
            >
              Create Shop Now →
            </Link>
          </div>
        ) : (
          <>
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Shop Name
                </span>
                <p className="text-lg font-bold text-stone-900 truncate font-serif">{shop.name}</p>
                <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                  {shop.status || 'VERIFIED'}
                </span>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Active Products
                </span>
                <p className="text-2xl font-black text-stone-900">{productCount}</p>
                <Link href="/seller/products" className="text-xs text-orange-600 hover:underline">
                  View catalog →
                </Link>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Low Stock Variants
                </span>
                <p className="text-2xl font-black text-stone-900">{lowStockCount}</p>
                <Link href="/seller/inventory" className="text-xs text-orange-600 hover:underline">
                  Manage inventory →
                </Link>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Bargaining Status
                </span>
                <p className="text-lg font-bold text-stone-900">
                  {shop.is_bargaining_enabled ? '🤝 Enabled' : 'Disabled'}
                </p>
                <span className="text-xs text-stone-500">Configured per product</span>
              </div>
            </div>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                href="/seller/products"
                className="group p-6 bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all space-y-3"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  👗
                </div>
                <h3 className="text-lg font-bold text-stone-900 font-serif group-hover:text-orange-600 transition-colors">
                  Product Catalog & Variants
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Add, edit, or archive products with multi-size and color variant matrix, SKUs, and imagery.
                </p>
              </Link>

              <Link
                href="/seller/inventory"
                className="group p-6 bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all space-y-3"
              >
                <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  📦
                </div>
                <h3 className="text-lg font-bold text-stone-900 font-serif group-hover:text-orange-600 transition-colors">
                  Inventory & Stock Logs
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Real-time variant stock tracking, low-stock warnings, and atomic inventory movement audits.
                </p>
              </Link>

              <Link
                href="/seller/shop"
                className="group p-6 bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all space-y-3"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🏬
                </div>
                <h3 className="text-lg font-bold text-stone-900 font-serif group-hover:text-orange-600 transition-colors">
                  Shop Profile & Gallery
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Update store coordinates, address, phone number, operating status, and storefront gallery photos.
                </p>
              </Link>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
