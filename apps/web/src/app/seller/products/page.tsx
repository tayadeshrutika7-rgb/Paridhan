'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/auth-context';
import { supabase } from '../../../lib/supabase';
import { Database } from '@paridhan/types';

type Product = Database['public']['Tables']['products']['Row'] & {
  product_variants?: Database['public']['Tables']['product_variants']['Row'][];
  product_images?: Database['public']['Tables']['product_images']['Row'][];
};

export default function SellerProductsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    } else if (user) {
      fetchProducts();
    }
  }, [user, isLoading, router]);

  const fetchProducts = async () => {
    if (!user) return;
    setIsFetching(true);

    // 1. Get seller's shop
    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('seller_id', user.id)
      .maybeSingle();

    if (shop) {
      setShopId(shop.id);
      const { data } = await supabase
        .from('products')
        .select('*, product_variants(*), product_images(*)')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false });

      if (data) setProducts(data as any);
    }
    setIsFetching(false);
  };

  const handleArchive = async (productId: string) => {
    const { error } = await supabase
      .from('products')
      .update({ status: 'ARCHIVED', updated_at: new Date().toISOString() })
      .eq('id', productId);

    if (!error) {
      await fetchProducts();
    }
  };

  if (isLoading || isFetching) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-stone-500 font-medium">Loading products catalog...</p>
      </div>
    );
  }

  if (!shopId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-stone-900 font-serif">No Shop Registered</h2>
        <p className="text-stone-600 text-sm">You must create your shop profile before adding clothing products.</p>
        <Link
          href="/seller/shop"
          className="inline-block px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-sm"
        >
          Create Shop First →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <h1 className="text-3xl font-extrabold text-stone-900 font-serif">Product Catalog</h1>
          <p className="text-sm text-stone-600 mt-1">
            Manage your store apparel items, size/color variants, and pricing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/seller/inventory"
            className="px-4 py-2 border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-bold rounded-lg"
          >
            Inventory Stock
          </Link>
          <Link
            href="/seller/products/new"
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg shadow-sm"
          >
            + Add New Product
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-4">
          <p className="text-stone-600 font-medium">No products in your store catalog yet.</p>
          <Link
            href="/seller/products/new"
            className="inline-block px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-lg"
          >
            Create Your First Product
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Base Price</th>
                <th className="py-3.5 px-4">Variants</th>
                <th className="py-3.5 px-4">Total Stock</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {products.map((prod) => {
                const totalStock = prod.product_variants?.reduce((sum, v) => sum + v.stock_quantity, 0) || 0;
                const variantCount = prod.product_variants?.length || 0;
                const primaryImg = prod.product_images?.find((img) => img.is_primary)?.image_url ||
                  prod.product_images?.[0]?.image_url;

                return (
                  <tr key={prod.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-stone-400">
                          {primaryImg ? (
                            <img src={primaryImg} alt="" className="w-full h-full object-cover" />
                          ) : (
                            prod.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-stone-900 block">{prod.name}</span>
                          <span className="text-stone-400 text-[10px]">{prod.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-900">₹{prod.base_price}</td>
                    <td className="py-3 px-4 text-stone-600">{variantCount} size/color variants</td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          totalStock === 0 ? 'text-red-600 font-bold' : totalStock <= 5 ? 'text-amber-600' : 'text-stone-700'
                        }`}
                      >
                        {totalStock} units
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          prod.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {prod.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <Link
                        href={`/products/${prod.slug || prod.id}`}
                        className="text-stone-500 hover:text-stone-800 font-semibold"
                      >
                        Preview
                      </Link>
                      {prod.status !== 'ARCHIVED' && (
                        <button
                          onClick={() => handleArchive(prod.id)}
                          className="text-red-600 hover:text-red-800 font-semibold"
                        >
                          Archive
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
