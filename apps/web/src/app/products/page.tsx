'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { Database } from '@paridhan/types';

type Product = Database['public']['Tables']['products']['Row'] & {
  product_images?: Database['public']['Tables']['product_images']['Row'][];
  product_variants?: Database['public']['Tables']['product_variants']['Row'][];
  shops?: Database['public']['Tables']['shops']['Row'];
  categories?: Database['public']['Tables']['categories']['Row'];
};

type Category = Database['public']['Tables']['categories']['Row'];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedSize, setSelectedSize] = useState<string>('ALL');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [bargainingOnly, setBargainingOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'RELEVANCE' | 'PRICE_ASC' | 'PRICE_DESC' | 'RATING_DESC' | 'NEWEST'>('RELEVANCE');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInitial();
  }, []);

  const fetchInitial = async () => {
    setIsLoading(true);
    const [productsRes, catRes] = await Promise.all([
      supabase
        .from('products')
        .select('*, product_images(*), product_variants(*), shops(*), categories(*)')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
    ]);

    if (productsRes.data) setProducts(productsRes.data as any);
    if (catRes.data) setCategories(catRes.data);
    setIsLoading(false);
  };

  const filteredProducts = products.filter((product) => {
    // 1. Category Filter
    const matchesCategory = selectedCategory === 'ALL' || product.category_id === selectedCategory;

    // 2. Search Text
    const q = search.toLowerCase().trim();
    const matchesSearch = !q ||
      product.name.toLowerCase().includes(q) ||
      product.description.toLowerCase().includes(q) ||
      (product.shops?.name && product.shops.name.toLowerCase().includes(q)) ||
      (product.categories?.name && product.categories.name.toLowerCase().includes(q));

    // 3. Stock Availability
    const matchesStock = !inStockOnly || product.product_variants?.some((v) => v.is_active && v.stock_quantity > 0);

    // 4. Bargaining
    const matchesBargain = !bargainingOnly || (product.is_bargaining_allowed && product.shops?.is_bargaining_enabled);

    // 5. Size Filter
    const matchesSize = selectedSize === 'ALL' || product.product_variants?.some((v) => v.size.toLowerCase() === selectedSize.toLowerCase());

    // 6. Max Price
    const matchesPrice = maxPrice === '' || product.base_price <= maxPrice;

    return matchesCategory && matchesSearch && matchesStock && matchesBargain && matchesSize && matchesPrice;
  });

  // Sorting
  filteredProducts.sort((a, b) => {
    if (sortBy === 'PRICE_ASC') return a.base_price - b.base_price;
    if (sortBy === 'PRICE_DESC') return b.base_price - a.base_price;
    if (sortBy === 'RATING_DESC') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'NEWEST') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return 0;
  });

  const availableSizes = ['ALL', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-stone-900 font-serif">Explore Local Fashion</h1>
        <p className="text-stone-600 mt-1">
          Authentic ethnic, festive, and daily wear from verified nearby boutique clothing retailers
        </p>
      </div>

      {/* Main Filter & Search Control Panel */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search casual shirts, pure silk sarees, kurtas, shops..."
            className="w-full md:w-96 px-4 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
          />

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-500 uppercase">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-lg border border-stone-300 text-xs font-semibold bg-white text-stone-700 outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="RELEVANCE">Relevance</option>
                <option value="PRICE_ASC">Price: Low to High</option>
                <option value="PRICE_DESC">Price: High to Low</option>
                <option value="RATING_DESC">Top Rated</option>
                <option value="NEWEST">Newest Arrivals</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-500 uppercase">Max ₹:</span>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : '')}
                placeholder="Any"
                className="w-24 px-3 py-2 rounded-lg border border-stone-300 text-xs text-stone-700 outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Secondary Filter Chips: Categories, Sizes, Toggles */}
        <div className="pt-3 border-t border-stone-100 flex flex-wrap gap-4 items-center justify-between text-xs">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <span className="font-semibold text-stone-500 uppercase tracking-wider pr-1">Category:</span>
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Size Chips & Toggles */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-stone-500 uppercase tracking-wider pr-1">Size:</span>
              {availableSizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all ${
                    selectedSize === s
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 font-semibold text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                In Stock Only
              </label>

              <label className="flex items-center gap-1.5 font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded cursor-pointer border border-amber-200">
                <input
                  type="checkbox"
                  checked={bargainingOnly}
                  onChange={(e) => setBargainingOnly(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                🤝 Bargainable
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-stone-500 font-medium">Loading clothing catalog...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-20 text-center text-stone-500 bg-white rounded-2xl border border-stone-200 p-8">
          <p className="text-lg font-serif font-bold text-stone-800">No products matched your search</p>
          <p className="text-xs text-stone-500 mt-1">Try clearing some filters or searching with different keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const primaryImg = product.product_images?.find((img) => img.is_primary)?.image_url ||
              product.product_images?.[0]?.image_url;
            const hasStock = product.product_variants?.some((v) => v.is_active && v.stock_quantity > 0);
            const sizes = Array.from(new Set(product.product_variants?.map((v) => v.size) || [])).join(', ');

            return (
              <Link
                key={product.id}
                href={`/products/${product.slug || product.id}`}
                className="group bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md hover:border-orange-300 transition-all flex flex-col"
              >
                <div className="h-60 bg-stone-100 relative overflow-hidden flex items-center justify-center">
                  {primaryImg ? (
                    <img
                      src={primaryImg}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <span className="text-stone-400 font-serif text-3xl font-bold">{product.name.charAt(0)}</span>
                  )}

                  {!hasStock && (
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                        Out of Stock
                      </span>
                    </div>
                  )}

                  {product.is_bargaining_allowed && (
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-amber-500/90 text-white text-[10px] font-bold rounded shadow-sm">
                      🤝 Bargain Available
                    </span>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                      <span className="truncate">{product.shops?.name || 'Local Shop'}</span>
                      {product.rating && (
                        <span className="text-amber-600 font-bold">★ {product.rating.toFixed(1)}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-stone-900 group-hover:text-orange-600 transition-colors line-clamp-1 mt-0.5">
                      {product.name}
                    </h3>
                    <p className="text-xs text-stone-500 line-clamp-1">{product.description}</p>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-black text-stone-900">₹{product.base_price}</span>
                      {sizes && <span className="text-[10px] text-stone-400 block">Sizes: {sizes}</span>}
                    </div>
                    <span className="text-xs text-orange-600 font-semibold group-hover:underline">
                      View Details →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

