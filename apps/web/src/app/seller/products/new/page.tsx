'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../context/auth-context';
import { supabase } from '../../../../lib/supabase';
import { Database } from '@paridhan/types';

type Category = Database['public']['Tables']['categories']['Row'];

interface VariantFormItem {
  size: string;
  color: string;
  sku: string;
  price: number;
  stockQuantity: number;
}

export default function NewProductPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [basePrice, setBasePrice] = useState<number>(999);
  const [isBargainingAllowed, setIsBargainingAllowed] = useState(true);
  const [minBargainPrice, setMinBargainPrice] = useState<number>(799);
  const [imageUrl, setImageUrl] = useState('');

  // Initial variant matrix
  const [variants, setVariants] = useState<VariantFormItem[]>([
    { size: 'S', color: 'Black', sku: 'SHIRT-BLK-S', price: 999, stockQuantity: 10 },
    { size: 'M', color: 'Black', sku: 'SHIRT-BLK-M', price: 999, stockQuantity: 15 },
    { size: 'L', color: 'Black', sku: 'SHIRT-BLK-L', price: 999, stockQuantity: 8 },
    { size: 'M', color: 'White', sku: 'SHIRT-WHT-M', price: 999, stockQuantity: 12 },
  ]);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    } else if (user) {
      fetchShopAndCategories();
    }
  }, [user, isLoading, router]);

  const fetchShopAndCategories = async () => {
    if (!user) return;
    const [shopRes, catRes] = await Promise.all([
      supabase.from('shops').select('id').eq('seller_id', user.id).maybeSingle(),
      supabase.from('categories').select('*').order('name'),
    ]);

    if (shopRes.data) setShopId(shopRes.data.id);
    if (catRes.data) {
      setCategories(catRes.data);
      if (catRes.data.length > 0) setCategoryId(catRes.data[0].id);
    }
  };

  const addVariantRow = () => {
    setVariants([
      ...variants,
      {
        size: 'M',
        color: 'Blue',
        sku: `SKU-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        price: basePrice,
        stockQuantity: 5,
      },
    ]);
  };

  const removeVariantRow = (index: number) => {
    if (variants.length <= 1) return;
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariantRow = (index: number, field: keyof VariantFormItem, val: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: val };
    setVariants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) {
      setStatusMsg('Error: No shop found for this seller account. Please create a shop first.');
      return;
    }

    setStatusMsg(null);
    setIsSubmitting(true);

    try {
      const baseSlug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
      const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

      // 1. Create Product
      const { data: product, error: prodError } = await supabase
        .from('products')
        .insert({
          shop_id: shopId,
          category_id: categoryId,
          name,
          slug,
          description,
          base_price: Number(basePrice),
          status: 'ACTIVE',
          is_bargaining_allowed: isBargainingAllowed,
          min_bargain_price: minBargainPrice ? Number(minBargainPrice) : null,
        })
        .select()
        .single();

      if (prodError || !product) {
        throw new Error(prodError?.message || 'Failed to create product');
      }

      // 2. Insert Variants
      const variantPayloads = variants.map((v) => ({
        product_id: product.id,
        sku: v.sku.trim().toUpperCase(),
        size: v.size.trim(),
        color: v.color.trim(),
        price: Number(v.price) || Number(basePrice),
        stock_quantity: Number(v.stockQuantity) || 0,
        is_active: true,
      }));

      const { data: insertedVariants, error: varError } = await supabase
        .from('product_variants')
        .insert(variantPayloads)
        .select();

      if (varError) {
        throw new Error(varError.message);
      }

      // 3. Log initial inventory movements
      if (insertedVariants) {
        for (const v of insertedVariants) {
          if (v.stock_quantity > 0) {
            await supabase.from('inventory_movements').insert({
              variant_id: v.id,
              quantity_change: v.stock_quantity,
              reason: 'RESTOCK',
              reference_id: product.id,
            });
          }
        }
      }

      // 4. Insert image if provided
      if (imageUrl.trim()) {
        await supabase.from('product_images').insert({
          product_id: product.id,
          image_url: imageUrl.trim(),
          is_primary: true,
          display_order: 0,
        });
      }

      setStatusMsg('Product created successfully with variants and inventory!');
      setTimeout(() => {
        router.push('/seller/products');
      }, 1200);
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center justify-between pb-6 border-b border-stone-200">
        <div>
          <h1 className="text-3xl font-extrabold text-stone-900 font-serif">Add New Product</h1>
          <p className="text-sm text-stone-600 mt-1">
            Create an apparel listing with size/color matrix variants and initial inventory
          </p>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 bg-orange-50 border border-orange-200 text-orange-800 text-sm rounded-lg">
          {statusMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
        {/* Product Details */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-stone-900 font-serif">1. General Information</h2>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Product Title
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Handcrafted Cotton Bandhani Kurta"
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide fabric details, styling suggestions, and wash care instructions..."
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Base Selling Price (₹)
              </label>
              <input
                type="number"
                required
                min={1}
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Primary Product Image URL
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
        </div>

        {/* Bargaining Settings */}
        <div className="space-y-4 pt-4 border-t border-stone-100">
          <h2 className="text-lg font-bold text-stone-900 font-serif">2. Bargaining Settings</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isBargainingAllowed}
              onChange={(e) => setIsBargainingAllowed(e.target.checked)}
              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
            />
            <span className="text-sm font-semibold text-stone-800">
              Allow Customers to Bargain on this Item
            </span>
          </label>

          {isBargainingAllowed && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Minimum Bargain Price / Floor (₹)
              </label>
              <input
                type="number"
                min={1}
                value={minBargainPrice}
                onChange={(e) => setMinBargainPrice(Number(e.target.value))}
                className="w-full sm:w-64 px-4 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Automated counter-offers or instant acceptance will not go below this floor price.
              </p>
            </div>
          )}
        </div>

        {/* Size/Color Variant Matrix */}
        <div className="space-y-4 pt-4 border-t border-stone-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-stone-900 font-serif">3. Size & Color Variants</h2>
              <p className="text-xs text-stone-500">Each variant tracks its own unique SKU and inventory stock</p>
            </div>
            <button
              type="button"
              onClick={addVariantRow}
              className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-lg transition-all"
            >
              + Add Another Variant
            </button>
          </div>

          <div className="space-y-3">
            {variants.map((variant, idx) => (
              <div
                key={idx}
                className="p-3 bg-stone-50 rounded-xl border border-stone-200 grid grid-cols-2 sm:grid-cols-6 gap-3 items-center"
              >
                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Color</label>
                  <input
                    type="text"
                    required
                    value={variant.color}
                    onChange={(e) => updateVariantRow(idx, 'color', e.target.value)}
                    placeholder="Black"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Size</label>
                  <input
                    type="text"
                    required
                    value={variant.size}
                    onChange={(e) => updateVariantRow(idx, 'size', e.target.value)}
                    placeholder="S, M, L"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">SKU</label>
                  <input
                    type="text"
                    required
                    value={variant.sku}
                    onChange={(e) => updateVariantRow(idx, 'sku', e.target.value)}
                    placeholder="SKU-123"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={variant.price}
                    onChange={(e) => updateVariantRow(idx, 'price', Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Stock</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={variant.stockQuantity}
                    onChange={(e) => updateVariantRow(idx, 'stockQuantity', Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white"
                  />
                </div>

                <div className="flex items-end justify-center pt-4 sm:pt-0">
                  <button
                    type="button"
                    disabled={variants.length <= 1}
                    onClick={() => removeVariantRow(idx)}
                    className="text-xs text-red-600 hover:text-red-800 font-bold disabled:opacity-30"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 text-sm"
        >
          {isSubmitting ? 'Publishing product...' : 'Publish Product to Marketplace'}
        </button>
      </form>
    </div>
  );
}
