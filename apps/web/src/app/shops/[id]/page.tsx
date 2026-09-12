'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { Database } from '@paridhan/types';

type ShopDetail = Database['public']['Tables']['shops']['Row'] & {
  shop_images?: Database['public']['Tables']['shop_images']['Row'][];
  products?: (Database['public']['Tables']['products']['Row'] & {
    product_images?: Database['public']['Tables']['product_images']['Row'][];
    product_variants?: Database['public']['Tables']['product_variants']['Row'][];
  })[];
};

export default function ShopDetailPage() {
  const params = useParams();
  const shopIdOrSlug = params.id as string;

  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (shopIdOrSlug) {
      fetchShop();
    }
  }, [shopIdOrSlug]);

  const fetchShop = async () => {
    setIsLoading(true);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shopIdOrSlug);

    const query = supabase
      .from('shops')
      .select('*, shop_images(*), products(*, product_images(*), product_variants(*))');

    const { data } = isUuid
      ? await query.eq('id', shopIdOrSlug).maybeSingle()
      : await query.eq('slug', shopIdOrSlug).maybeSingle();

    if (data) setShop(data as any);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-stone-500 font-medium">Loading shop details...</p>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <p className="text-stone-600 font-medium">Shop not found.</p>
        <Link href="/shops" className="text-orange-600 font-bold hover:underline">
          ← Back to Shop Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Banner & Shop Info */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="h-56 bg-stone-900 relative">
          {shop.banner_url ? (
            <img src={shop.banner_url} alt={shop.name} className="w-full h-full object-cover opacity-80" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-orange-950 to-stone-900">
              <span className="text-white/20 text-6xl font-serif font-black">{shop.name}</span>
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8 relative -mt-12 bg-white rounded-t-3xl border-t border-stone-100 flex flex-col sm:flex-row justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-stone-900 font-serif">{shop.name}</h1>
              {shop.is_bargaining_enabled && (
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                  🤝 Price Bargaining Available
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 font-medium">
              📍 {shop.address_line1}, {shop.city}, {shop.state} - {shop.pincode} • 📞 {shop.phone}
            </p>
            <p className="text-sm text-stone-600 max-w-2xl pt-2">
              {shop.description || 'Verified local clothing retailer on PARIDHAN.'}
            </p>
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-stone-200 sm:pl-8 pt-4 sm:pt-0">
            <div className="text-right">
              <div className="text-2xl font-black text-amber-600">★ {shop.rating?.toFixed(1) || '4.8'}</div>
              <p className="text-xs text-stone-500">{shop.review_count || 0} reviews</p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Catalog Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-stone-900 font-serif">In-Store Collection</h2>
          <span className="text-xs text-stone-500 font-medium">
            {shop.products?.length || 0} items available
          </span>
        </div>

        {!shop.products || shop.products.length === 0 ? (
          <div className="py-16 text-center text-stone-500 bg-white rounded-2xl border border-stone-200">
            No products uploaded for this shop yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {shop.products.map((product) => {
              const primaryImg = product.product_images?.find((img) => img.is_primary)?.image_url ||
                product.product_images?.[0]?.image_url;
              const hasStock = product.product_variants?.some((v) => v.is_active && v.stock_quantity > 0);

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug || product.id}`}
                  className="group bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md hover:border-orange-300 transition-all flex flex-col"
                >
                  <div className="h-56 bg-stone-100 relative overflow-hidden flex items-center justify-center">
                    {primaryImg ? (
                      <img
                        src={primaryImg}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <span className="text-stone-400 font-serif text-2xl font-bold">{product.name.charAt(0)}</span>
                    )}

                    {!hasStock && (
                      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                          Out of Stock
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                        {product.name}
                      </h3>
                      <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">{product.description}</p>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                      <div>
                        <span className="text-xs text-stone-400">Price: </span>
                        <span className="text-sm font-black text-stone-900">₹{product.base_price}</span>
                      </div>
                      {product.is_bargaining_allowed && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Bargain Eligible
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
