'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { Database } from '@paridhan/types';

type Shop = Database['public']['Tables']['shops']['Row'] & {
  shop_images?: Database['public']['Tables']['shop_images']['Row'][];
};

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('shops')
      .select('*, shop_images(*)')
      .eq('status', 'VERIFIED')
      .order('rating', { ascending: false });

    if (data) setShops(data as any);
    setIsLoading(false);
  };

  const filteredShops = shops.filter((shop) => {
    const matchesCity = selectedCity === 'ALL' || shop.city.toLowerCase() === selectedCity.toLowerCase();
    const matchesSearch = shop.name.toLowerCase().includes(search.toLowerCase()) ||
      (shop.description && shop.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCity && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-stone-900 font-serif">Local Clothing Shops</h1>
        <p className="text-stone-600 mt-1">
          Explore nearby physical clothing stores, handlooms, and boutique ateliers
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by shop name or style..."
          className="w-full sm:w-80 px-4 py-2 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
        />

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">City:</span>
          {['ALL', 'Jaipur', 'Jodhpur', 'Delhi', 'Mumbai'].map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedCity === city
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Shop Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-stone-500 font-medium">Loading nearby shops...</div>
      ) : filteredShops.length === 0 ? (
        <div className="py-20 text-center text-stone-500">
          No shops found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredShops.map((shop) => (
            <Link
              key={shop.id}
              href={`/shops/${shop.slug || shop.id}`}
              className="group bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md hover:border-orange-300 transition-all flex flex-col"
            >
              <div className="h-44 bg-stone-100 relative overflow-hidden flex items-center justify-center">
                {shop.banner_url ? (
                  <img
                    src={shop.banner_url}
                    alt={shop.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <span className="text-stone-400 font-serif text-3xl font-bold">
                    {shop.name.charAt(0)}
                  </span>
                )}
                {shop.is_bargaining_enabled && (
                  <span className="absolute top-3 right-3 px-2.5 py-1 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-full shadow-sm">
                    🤝 Bargaining Active
                  </span>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-stone-900 group-hover:text-orange-600 transition-colors font-serif">
                      {shop.name}
                    </h2>
                    <div className="flex items-center text-xs font-bold text-amber-600">
                      ★ {shop.rating?.toFixed(1) || '4.8'}
                    </div>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    📍 {shop.address_line1}, {shop.city}
                  </p>
                  <p className="text-xs text-stone-600 mt-2 line-clamp-2">
                    {shop.description || 'Traditional and contemporary local clothing.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                  <span>📞 {shop.phone}</span>
                  <span className="text-orange-600 font-semibold group-hover:underline">
                    View Catalog →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
