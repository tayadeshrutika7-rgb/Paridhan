'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/auth-context';
import { supabase } from '../../../lib/supabase';

interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  price: number;
  stockQuantity: number;
  isActive: boolean;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

export default function SellerInventoryPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  // Adjustment Modal State
  const [selectedVariant, setSelectedVariant] = useState<InventoryItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState<string>('RESTOCK');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    } else if (user) {
      fetchInventory();
    }
  }, [user, isLoading, router]);

  const fetchInventory = async () => {
    if (!user) return;
    setIsFetching(true);

    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('seller_id', user.id)
      .maybeSingle();

    if (shop) {
      setShopId(shop.id);
      const { data } = await supabase
        .from('product_variants')
        .select('*, products!inner(id, name, shop_id)')
        .eq('products.shop_id', shop.id)
        .order('stock_quantity', { ascending: true });

      if (data) {
        const formatted: InventoryItem[] = (data as any[]).map((v) => ({
          id: v.id,
          productId: v.product_id,
          productName: v.products?.name || 'Unknown Item',
          sku: v.sku,
          size: v.size,
          color: v.color,
          price: v.price,
          stockQuantity: v.stock_quantity,
          isActive: v.is_active,
          isLowStock: v.stock_quantity <= 5 && v.stock_quantity > 0,
          isOutOfStock: v.stock_quantity <= 0,
        }));
        setItems(formatted);
      }
    }
    setIsFetching(false);
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) return;

    setStatusMsg(null);
    const newStock = selectedVariant.stockQuantity + Number(adjustAmount);
    if (newStock < 0) {
      setStatusMsg(`Cannot reduce stock below 0. Current stock is ${selectedVariant.stockQuantity}`);
      return;
    }

    // 1. Update variant stock
    const { error: updateError } = await supabase
      .from('product_variants')
      .update({
        stock_quantity: newStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedVariant.id);

    if (updateError) {
      setStatusMsg(`Error updating stock: ${updateError.message}`);
      return;
    }

    // 2. Insert movement audit record
    await supabase.from('inventory_movements').insert({
      variant_id: selectedVariant.id,
      quantity_change: Number(adjustAmount),
      reason: adjustReason,
    });

    setSelectedVariant(null);
    await fetchInventory();
  };

  if (isLoading || isFetching) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-stone-500 font-medium">Loading inventory stock levels...</p>
      </div>
    );
  }

  if (!shopId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-stone-900 font-serif">No Shop Registered</h2>
        <p className="text-stone-600 text-sm">Please register your shop before managing inventory.</p>
        <Link
          href="/seller/shop"
          className="inline-block px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-sm"
        >
          Register Shop →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <h1 className="text-3xl font-extrabold text-stone-900 font-serif">Inventory & Stock Control</h1>
          <p className="text-sm text-stone-600 mt-1">
            Real-time variant-level stock management and audit logs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/seller/products"
            className="px-4 py-2 border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-bold rounded-lg"
          >
            Product Catalog
          </Link>
          <Link
            href="/seller/products/new"
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg shadow-sm"
          >
            + Add Product
          </Link>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {statusMsg}
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-4">
          <p className="text-stone-600 font-medium">No inventory variants found in your catalog.</p>
          <Link
            href="/seller/products/new"
            className="inline-block px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-lg"
          >
            Create Products with Variants
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Item & Variant</th>
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4">Unit Price</th>
                <th className="py-3.5 px-4">Current Stock</th>
                <th className="py-3.5 px-4">Stock Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-stone-900 block">{item.productName}</span>
                    <span className="text-stone-500 text-[11px]">
                      {item.color} • Size {item.size}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-stone-600">{item.sku}</td>
                  <td className="py-3 px-4 font-bold text-stone-900">₹{item.price}</td>
                  <td className="py-3 px-4 font-black text-stone-900 text-sm">{item.stockQuantity}</td>
                  <td className="py-3 px-4">
                    {item.isOutOfStock ? (
                      <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded-full">
                        Out of Stock
                      </span>
                    ) : item.isLowStock ? (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                        Low Stock (≤ 5)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-bold rounded-full">
                        In Stock
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedVariant(item);
                        setAdjustAmount(10);
                        setAdjustReason('RESTOCK');
                      }}
                      className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 rounded-lg text-xs font-bold transition-all"
                    >
                      Adjust Stock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick Stock Adjustment Modal */}
      {selectedVariant && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl border border-stone-200">
            <div>
              <h3 className="text-lg font-bold text-stone-900 font-serif">Adjust Variant Stock</h3>
              <p className="text-xs text-stone-500 mt-1">
                {selectedVariant.productName} ({selectedVariant.color} / {selectedVariant.size}) • SKU: {selectedVariant.sku}
              </p>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Quantity Change (+ to add, - to subtract)
                </label>
                <input
                  type="number"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  New stock will be: <strong>{selectedVariant.stockQuantity + Number(adjustAmount)}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Reason for Movement
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                >
                  <option value="RESTOCK">RESTOCK (New shipment received)</option>
                  <option value="ADJUSTMENT">ADJUSTMENT (Manual inventory count correction)</option>
                  <option value="RETURN">RETURN (Customer return)</option>
                  <option value="DAMAGED">DAMAGED (Damaged / written off)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedVariant(null)}
                  className="flex-1 py-2.5 border border-stone-300 text-stone-700 text-xs font-bold rounded-lg hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
