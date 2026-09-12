'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { Database } from '@paridhan/types';

type ProductVariant = Database['public']['Tables']['product_variants']['Row'];
type ProductImage = Database['public']['Tables']['product_images']['Row'];
type Shop = Database['public']['Tables']['shops']['Row'];

type ProductDetail = Database['public']['Tables']['products']['Row'] & {
  product_images?: ProductImage[];
  product_variants?: ProductVariant[];
  shops?: Shop;
  categories?: Database['public']['Tables']['categories']['Row'];
};

export default function ProductDetailPage() {
  const params = useParams();
  const idOrSlug = params.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (idOrSlug) {
      fetchProduct();
    }
  }, [idOrSlug]);

  const fetchProduct = async () => {
    setIsLoading(true);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const query = supabase
      .from('products')
      .select('*, product_images(*), product_variants(*), shops(*), categories(*)');

    const { data } = isUuid
      ? await query.eq('id', idOrSlug).maybeSingle()
      : await query.eq('slug', idOrSlug).maybeSingle();

    if (data) {
      const prod = data as any;
      setProduct(prod);

      // Set initial selected variant & image
      const firstVariant = prod.product_variants?.[0];
      if (firstVariant) {
        setSelectedColor(firstVariant.color);
        setSelectedSize(firstVariant.size);
      }

      const primaryImg = prod.product_images?.find((i: ProductImage) => i.is_primary)?.image_url ||
        prod.product_images?.[0]?.image_url;
      if (primaryImg) {
        setSelectedImage(primaryImg);
      }
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-stone-500 font-medium">Loading clothing details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <p className="text-stone-600 font-medium">Product not found.</p>
        <Link href="/products" className="text-orange-600 font-bold hover:underline">
          ← Back to Catalog
        </Link>
      </div>
    );
  }

  const variants = product.product_variants || [];
  const colors = Array.from(new Set(variants.map((v) => v.color)));
  const sizesForColor = variants
    .filter((v) => v.color === selectedColor)
    .map((v) => v.size);

  const activeVariant = variants.find(
    (v) => v.color === selectedColor && v.size === selectedSize,
  );

  const price = activeVariant ? activeVariant.price : product.base_price;
  const stock = activeVariant ? activeVariant.stock_quantity : 0;
  const isAvailable = !!activeVariant && activeVariant.is_active && stock > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-stone-500 mb-8">
        <Link href="/" className="hover:text-orange-600">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-orange-600">Catalog</Link>
        <span>/</span>
        {product.shops && (
          <>
            <Link href={`/shops/${product.shops.slug || product.shops.id}`} className="hover:text-orange-600">
              {product.shops.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-stone-900 font-medium truncate max-w-xs">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="h-[480px] bg-stone-100 rounded-3xl border border-stone-200 overflow-hidden flex items-center justify-center relative">
            {selectedImage ? (
              <img src={selectedImage} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-stone-400 font-serif text-6xl font-bold">{product.name.charAt(0)}</span>
            )}

            {product.is_bargaining_allowed && (
              <span className="absolute top-4 left-4 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full shadow-md">
                🤝 Direct Seller Bargaining Available
              </span>
            )}
          </div>

          {product.product_images && product.product_images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.product_images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img.image_url)}
                  className={`w-20 h-20 rounded-xl border-2 overflow-hidden flex-shrink-0 transition-all ${
                    selectedImage === img.image_url
                      ? 'border-orange-600 scale-105'
                      : 'border-stone-200 hover:border-stone-400'
                  }`}
                >
                  <img src={img.image_url} alt="Thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details & Variant Selection */}
        <div className="space-y-6">
          <div>
            {product.shops && (
              <Link
                href={`/shops/${product.shops.slug || product.shops.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md mb-2 border border-orange-200 hover:bg-orange-100 transition-all"
              >
                🏬 Sold by {product.shops.name} ({product.shops.city})
              </Link>
            )}
            <h1 className="text-3xl font-black text-stone-900 font-serif">{product.name}</h1>
            <p className="text-sm text-stone-600 mt-2 leading-relaxed">{product.description}</p>
          </div>

          {/* Pricing & Stock Status */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-stone-500 uppercase tracking-wider block font-semibold">
                Price
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-stone-900">₹{price}</span>
                {product.min_bargain_price && product.is_bargaining_allowed && (
                  <span className="text-xs text-stone-500">
                    (Floor: ₹{product.min_bargain_price})
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              {isAvailable ? (
                <div>
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                    ✓ In Stock ({stock} available)
                  </span>
                  {stock <= 5 && (
                    <span className="block text-[10px] text-red-600 font-bold mt-1">
                      ⚠️ Only {stock} left — order soon
                    </span>
                  )}
                </div>
              ) : (
                <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                  ✕ Currently Out of Stock
                </span>
              )}
            </div>
          </div>

          {/* Variant Selector: Colors */}
          {colors.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Select Color: <span className="text-stone-900 font-normal">{selectedColor}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setSelectedColor(color);
                      const availableSizes = variants.filter((v) => v.color === color).map((v) => v.size);
                      if (!availableSizes.includes(selectedSize)) {
                        setSelectedSize(availableSizes[0] || '');
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      selectedColor === color
                        ? 'border-orange-600 bg-orange-600 text-white shadow-sm'
                        : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Variant Selector: Sizes */}
          {sizesForColor.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Select Size: <span className="text-stone-900 font-normal">{selectedSize}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {sizesForColor.map((size) => {
                  const v = variants.find((item) => item.color === selectedColor && item.size === size);
                  const isStocked = v && v.is_active && v.stock_quantity > 0;

                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        selectedSize === size
                          ? 'border-orange-600 bg-orange-50 text-orange-700 font-bold'
                          : isStocked
                          ? 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
                          : 'border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      {size} {!isStocked && '(Out of stock)'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button
              disabled={!isAvailable}
              className="flex-1 py-3.5 px-6 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 text-sm"
            >
              {isAvailable ? 'Add to Cart' : 'Unavailable'}
            </button>

            {product.is_bargaining_allowed && (
              <button
                disabled={!isAvailable}
                className="py-3.5 px-6 border-2 border-amber-600 text-amber-800 hover:bg-amber-50 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>🤝 Start Bargaining</span>
              </button>
            )}
          </div>

          {activeVariant && (
            <div className="text-[11px] text-stone-400">
              SKU: <span className="font-mono text-stone-600">{activeVariant.sku}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
