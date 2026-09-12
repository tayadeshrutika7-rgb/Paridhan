'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/auth-context';
import { supabase } from '../../../lib/supabase';
import { Database } from '@paridhan/types';

type Shop = Database['public']['Tables']['shops']['Row'];

export default function SellerShopPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [shop, setShop] = useState<Shop | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('Jaipur');
  const [state, setState] = useState('Rajasthan');
  const [pincode, setPincode] = useState('302001');
  const [phone, setPhone] = useState('');
  const [isBargainingEnabled, setIsBargainingEnabled] = useState(true);
  const [bannerUrl, setBannerUrl] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    } else if (user) {
      fetchSellerShop();
    }
  }, [user, isLoading, router]);

  const fetchSellerShop = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('shops')
      .select('*')
      .eq('seller_id', user.id)
      .maybeSingle();

    if (data) {
      setShop(data);
      setName(data.name);
      setDescription(data.description || '');
      setAddressLine1(data.address_line1);
      setCity(data.city);
      setState(data.state);
      setPincode(data.pincode);
      setPhone(data.phone);
      setIsBargainingEnabled(data.is_bargaining_enabled);
      setBannerUrl(data.banner_url || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setStatusMsg(null);
    setIsSubmitting(true);

    if (shop) {
      // Update existing shop
      const { error } = await supabase
        .from('shops')
        .update({
          name,
          description,
          address_line1: addressLine1,
          city,
          state,
          pincode,
          phone,
          is_bargaining_enabled: isBargainingEnabled,
          banner_url: bannerUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shop.id);

      if (error) {
        setStatusMsg(`Error: ${error.message}`);
      } else {
        setStatusMsg('Shop details updated successfully!');
        await fetchSellerShop();
      }
    } else {
      // Create new shop
      const baseSlug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
      const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

      const { data, error } = await supabase
        .from('shops')
        .insert({
          seller_id: user.id,
          name,
          slug,
          description,
          address_line1: addressLine1,
          city,
          state,
          pincode,
          latitude: 26.9124,
          longitude: 75.7873,
          phone,
          status: 'VERIFIED',
          is_bargaining_enabled: isBargainingEnabled,
          banner_url: bannerUrl || null,
        })
        .select()
        .single();

      if (error) {
        setStatusMsg(`Error: ${error.message}`);
      } else {
        setShop(data);
        setStatusMsg('Shop created successfully!');
      }
    }
    setIsSubmitting(false);
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-stone-500 font-medium">Loading seller portal...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center justify-between pb-6 border-b border-stone-200">
        <div>
          <h1 className="text-3xl font-extrabold text-stone-900 font-serif">
            {shop ? 'Shop Settings & Profile' : 'Register Your Local Clothing Shop'}
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Manage your boutique storefront, location, and bargaining preferences
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/seller/products')}
            className="px-3 py-1.5 border border-stone-300 hover:bg-stone-50 rounded-lg text-xs font-semibold text-stone-700"
          >
            Manage Products →
          </button>
          <button
            onClick={() => router.push('/seller/inventory')}
            className="px-3 py-1.5 border border-stone-300 hover:bg-stone-50 rounded-lg text-xs font-semibold text-stone-700"
          >
            Inventory Stock →
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 bg-orange-50 border border-orange-200 text-orange-800 text-sm rounded-lg">
          {statusMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-stone-900 font-serif">Basic Shop Information</h2>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Shop Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rajputana Handlooms & Silks"
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell shoppers about your heritage, fabrics, and specialties..."
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Banner / Storefront Image URL
            </label>
            <input
              type="url"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-stone-100">
          <h2 className="text-lg font-bold text-stone-900 font-serif">Physical Store Location</h2>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Address Line
            </label>
            <input
              type="text"
              required
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Shop No. 12, Johari Bazar"
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                City
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                State
              </label>
              <input
                type="text"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                PIN Code
              </label>
              <input
                type="text"
                required
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-stone-300 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Contact Phone
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919876543210"
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 text-sm"
            />
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-stone-100">
          <h2 className="text-lg font-bold text-stone-900 font-serif">Marketplace Features</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isBargainingEnabled}
              onChange={(e) => setIsBargainingEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
            />
            <span className="text-sm font-semibold text-stone-800">
              Enable Interactive Customer Price Bargaining
            </span>
          </label>
          <p className="text-xs text-stone-500 pl-7">
            Allows shoppers to propose counter-offers within your configured price floors.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 text-sm"
        >
          {isSubmitting ? 'Saving changes...' : shop ? 'Save Shop Details' : 'Create Storefront'}
        </button>
      </form>
    </div>
  );
}
