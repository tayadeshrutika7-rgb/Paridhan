'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { supabase } from '../../lib/supabase';
import { Database } from '@paridhan/types';

type Address = Database['public']['Tables']['user_addresses']['Row'];

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, logout, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [newLabel, setNewLabel] = useState('Home');
  const [newRecipient, setNewRecipient] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLine1, setNewLine1] = useState('');
  const [newCity, setNewCity] = useState('Jaipur');
  const [newState, setNewState] = useState('Rajasthan');
  const [newPincode, setNewPincode] = useState('302001');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    } else if (user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      fetchAddresses(user.id);
    }
  }, [user, isLoading, router]);

  const fetchAddresses = async (userId: string) => {
    const { data } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });

    if (data) setAddresses(data);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setStatusMsg(null);
    const { error } = await supabase
      .from('users')
      .update({
        full_name: fullName,
        phone: phone.trim() ? phone.trim() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      setStatusMsg(`Error: ${error.message}`);
    } else {
      setStatusMsg('Profile updated successfully!');
      await refreshProfile();
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase.from('user_addresses').insert({
      user_id: user.id,
      label: newLabel,
      recipient_name: newRecipient || user.fullName,
      phone: newPhone || user.phone || '9876543210',
      address_line1: newLine1,
      city: newCity,
      state: newState,
      pincode: newPincode,
      is_default: addresses.length === 0,
    });

    if (!error) {
      setShowAddressForm(false);
      setNewLine1('');
      await fetchAddresses(user.id);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-stone-500 font-medium">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <h1 className="text-3xl font-extrabold text-stone-900 font-serif">Account Profile</h1>
          <p className="text-sm text-stone-600 mt-1">
            Manage your personal information, saved addresses, and active role
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-bold rounded-full uppercase tracking-wider">
            {user.role}
          </span>
          <button
            onClick={() => logout().then(() => router.push('/'))}
            className="px-4 py-2 border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold rounded-lg transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 bg-orange-50 border border-orange-200 text-orange-800 text-sm rounded-lg">
          {statusMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-stone-900 font-serif">Personal Details</h2>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Email
              </label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full px-3.5 py-2 rounded-lg bg-stone-100 border border-stone-200 text-stone-500 text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-orange-500 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full px-3.5 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-orange-500 outline-none text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg transition-all"
            >
              Save Profile Changes
            </button>
          </form>
        </div>

        {/* Addresses Section */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-stone-900 font-serif">Saved Addresses</h2>
              <p className="text-xs text-stone-500">Delivery locations for local shop orders</p>
            </div>
            <button
              onClick={() => setShowAddressForm(!showAddressForm)}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg transition-all"
            >
              {showAddressForm ? 'Cancel' : '+ Add Address'}
            </button>
          </div>

          {showAddressForm && (
            <form onSubmit={handleAddAddress} className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Label</label>
                  <input
                    type="text"
                    required
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Home / Work"
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Recipient Name</label>
                  <input
                    type="text"
                    required
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    placeholder={user.fullName || 'Recipient'}
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Address Line</label>
                <input
                  type="text"
                  required
                  value={newLine1}
                  onChange={(e) => setNewLine1(e.target.value)}
                  placeholder="Plot 42, Johari Bazar"
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    required
                    value={newPincode}
                    onChange={(e) => setNewPincode(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg transition-all"
              >
                Save New Address
              </button>
            </form>
          )}

          {addresses.length === 0 ? (
            <div className="text-center py-8 text-stone-500 text-sm">
              No saved addresses yet. Add one above for doorstep delivery.
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="p-4 rounded-xl border border-stone-200 hover:border-stone-300 flex items-start justify-between transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 text-sm">{addr.label}</span>
                      {addr.is_default && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-bold rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-700">
                      {addr.recipient_name} • {addr.phone}
                    </p>
                    <p className="text-xs text-stone-500">
                      {addr.address_line1}, {addr.city}, {addr.state} - {addr.pincode}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
