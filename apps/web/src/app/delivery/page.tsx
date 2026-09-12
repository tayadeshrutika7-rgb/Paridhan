'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface DeliveryTask {
  id: string;
  orderNumber: string;
  status: 'ASSIGNED' | 'ACCEPTED' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED';
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  pickupLat: number;
  pickupLng: number;
  pickupOtp: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerLat: number;
  customerLng: number;
  deliveryOtp: string;
  items: { name: string; size: string; color: string; quantity: number }[];
  totalAmount: number;
  paymentMethod: 'ONLINE_RAZORPAY' | 'CASH_ON_DELIVERY';
}

const INITIAL_DELIVERIES: DeliveryTask[] = [
  {
    id: 'del-101',
    orderNumber: 'ORD-8942-XQ',
    status: 'ASSIGNED',
    shopName: 'Royal Jaipur Silks',
    shopAddress: 'Shop #14, Bapu Bazaar, Jaipur, RJ 302003',
    shopPhone: '+91 98290 11223',
    pickupLat: 26.9186,
    pickupLng: 75.8245,
    pickupOtp: '4819',
    customerName: 'Ananya Sharma',
    customerAddress: 'Plot 42, Malviya Nagar, Jaipur, RJ 302017',
    customerPhone: '+91 98765 43210',
    customerLat: 26.8532,
    customerLng: 75.8051,
    deliveryOtp: '7294',
    items: [
      { name: 'Handcrafted Bandhani Silk Kurta', size: 'M', color: 'Crimson Red', quantity: 1 },
    ],
    totalAmount: 1700,
    paymentMethod: 'ONLINE_RAZORPAY',
  },
  {
    id: 'del-102',
    orderNumber: 'ORD-7711-KM',
    status: 'PICKED_UP',
    shopName: 'Marwar Handlooms',
    shopAddress: 'Lane 3, Johari Bazaar, Jaipur, RJ 302003',
    shopPhone: '+91 94140 55667',
    pickupLat: 26.9214,
    pickupLng: 75.8268,
    pickupOtp: '1134',
    customerName: 'Rohit Verma',
    customerAddress: 'Flat 302, Royal Residency, C-Scheme, Jaipur',
    customerPhone: '+91 91234 56789',
    customerLat: 26.9085,
    customerLng: 75.8012,
    deliveryOtp: '5521',
    items: [
      { name: 'Pure Linen Nehru Jacket', size: 'L', color: 'Sand Beige', quantity: 1 },
    ],
    totalAmount: 2400,
    paymentMethod: 'CASH_ON_DELIVERY',
  },
];

export default function DeliveryPartnerPortal() {
  const [deliveries, setDeliveries] = useState<DeliveryTask[]>(INITIAL_DELIVERIES);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [enteredOtp, setEnteredOtp] = useState<{ [key: string]: string }>({});
  const [otpError, setOtpError] = useState<{ [key: string]: string }>({});
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const activeDeliveries = deliveries.filter((d) => d.status !== 'DELIVERED' && d.status !== 'FAILED');
  const completedDeliveries = deliveries.filter((d) => d.status === 'DELIVERED' || d.status === 'FAILED');

  const handleAccept = (id: string) => {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'ACCEPTED' as const } : d)),
    );
    setSuccessNotice(`Assignment ${id} accepted! Navigate to the merchant shop for pickup.`);
  };

  const handleConfirmPickup = (task: DeliveryTask) => {
    const input = (enteredOtp[task.id] || '').trim();
    if (input !== task.pickupOtp) {
      setOtpError((prev) => ({ ...prev, [task.id]: 'Invalid Pickup OTP! Ask merchant for 4-digit code.' }));
      return;
    }
    setOtpError((prev) => ({ ...prev, [task.id]: '' }));
    setEnteredOtp((prev) => ({ ...prev, [task.id]: '' }));
    setDeliveries((prev) =>
      prev.map((d) => (d.id === task.id ? { ...d, status: 'PICKED_UP' as const } : d)),
    );
    setSuccessNotice(`Item picked up! Customer address and destination navigation are now unlocked.`);
  };

  const handleDepart = (id: string) => {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'OUT_FOR_DELIVERY' as const } : d)),
    );
    setSuccessNotice(`Order is now Out for Delivery. Parent order synced to SHIPPED.`);
  };

  const handleConfirmDelivery = (task: DeliveryTask) => {
    const input = (enteredOtp[task.id] || '').trim();
    if (input !== task.deliveryOtp) {
      setOtpError((prev) => ({ ...prev, [task.id]: 'Invalid Delivery OTP! Ask customer for 4-digit code.' }));
      return;
    }
    setOtpError((prev) => ({ ...prev, [task.id]: '' }));
    setEnteredOtp((prev) => ({ ...prev, [task.id]: '' }));
    setDeliveries((prev) =>
      prev.map((d) => (d.id === task.id ? { ...d, status: 'DELIVERED' as const } : d)),
    );
    setSuccessNotice(`Order ${task.orderNumber} successfully delivered! Earnings credited.`);
  };

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header banner */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                ROLE: DELIVERY PARTNER
              </span>
              <span className="text-xs text-emerald-200">Hyper-Local Logistics Hub</span>
            </div>
            <h1 className="text-2xl font-bold font-serif mt-1">Delivery Operations Portal</h1>
            <p className="text-sm text-emerald-100/80">
              Live pickup & doorstep delivery management with Two-Factor OTP Security and progressive privacy.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/20 transition-all"
            >
              Switch Interface
            </Link>
          </div>
        </div>

        {/* Success toast banner */}
        {successNotice && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center justify-between shadow-sm animate-fade-in">
            <span>✅ {successNotice}</span>
            <button
              onClick={() => setSuccessNotice(null)}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-900"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab selector & Metrics */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'ACTIVE'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              Active Tasks ({activeDeliveries.length})
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'HISTORY'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              Delivery History ({completedDeliveries.length})
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-xs font-medium text-stone-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              2-Factor OTP Security Enabled
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block"></span>
              Privacy Masking Active
            </span>
          </div>
        </div>

        {/* Deliveries List */}
        {activeTab === 'ACTIVE' ? (
          activeDeliveries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-500">
              <p className="text-base font-semibold">No active deliveries assigned at the moment.</p>
              <p className="text-xs mt-1 text-stone-400">New marketplace orders ready for pickup will appear here automatically.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeDeliveries.map((task) => {
                const isPrePickup = task.status === 'ASSIGNED' || task.status === 'ACCEPTED';
                const isPickedUp = task.status === 'PICKED_UP';
                const isOutForDelivery = task.status === 'OUT_FOR_DELIVERY';

                return (
                  <div
                    key={task.id}
                    className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm hover:shadow-md transition-shadow space-y-6"
                  >
                    {/* Top Order bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-4">
                      <div>
                        <span className="text-xs font-mono font-semibold text-stone-400">ORDER #{task.orderNumber}</span>
                        <h2 className="text-lg font-bold text-stone-900 mt-0.5">
                          {task.items.map((i) => `${i.quantity}x ${i.name} (${i.size}/${i.color})`).join(', ')}
                        </h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-lg uppercase tracking-wide">
                          {task.status.replace(/_/g, ' ')}
                        </span>
                        <span className="px-2.5 py-1 bg-stone-100 text-stone-700 text-xs font-bold rounded-lg">
                          ₹{task.totalAmount} • {task.paymentMethod === 'CASH_ON_DELIVERY' ? 'COD' : 'Prepaid'}
                        </span>
                      </div>
                    </div>

                    {/* Stage 1: Merchant Pickup Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-orange-900 uppercase tracking-wider flex items-center gap-1.5">
                            📍 Step 1: Merchant Pickup
                          </span>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${task.pickupLat},${task.pickupLng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-orange-700 hover:text-orange-900 underline flex items-center gap-1"
                          >
                            🗺️ Navigate to Shop
                          </a>
                        </div>
                        <p className="text-sm font-bold text-stone-900">{task.shopName}</p>
                        <p className="text-xs text-stone-600">{task.shopAddress}</p>
                        <p className="text-xs text-stone-500 font-mono">📞 {task.shopPhone}</p>
                        
                        {task.status === 'ACCEPTED' && (
                          <div className="pt-2 border-t border-orange-200/60 space-y-2">
                            <label className="text-xs font-bold text-orange-900 block">
                              Enter Shop Pickup OTP (Held by Shopkeeper):
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                maxLength={4}
                                placeholder="4-digit OTP (e.g. 4819)"
                                value={enteredOtp[task.id] || ''}
                                onChange={(e) =>
                                  setEnteredOtp((prev) => ({ ...prev, [task.id]: e.target.value }))
                                }
                                className="w-36 px-3 py-1.5 text-sm border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-center tracking-widest font-bold"
                              />
                              <button
                                onClick={() => handleConfirmPickup(task)}
                                className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                              >
                                Verify Pickup
                              </button>
                            </div>
                            {otpError[task.id] && (
                              <p className="text-xs text-red-600 font-semibold">{otpError[task.id]}</p>
                            )}
                            <p className="text-[10px] text-orange-800/80 italic">
                              Demo Helper: Merchant pickup OTP is <span className="font-mono font-bold text-orange-950">{task.pickupOtp}</span>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Stage 2: Customer Handover Section */}
                      <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                            🏠 Step 2: Customer Handover
                          </span>
                          {!isPrePickup ? (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${task.customerLat},${task.customerLng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-teal-700 hover:text-teal-900 underline flex items-center gap-1"
                            >
                              🗺️ Navigate to Customer
                            </a>
                          ) : (
                            <span className="text-[11px] text-stone-400 font-medium italic">
                              🔒 Unlocks after pickup
                            </span>
                          )}
                        </div>

                        {isPrePickup ? (
                          <div className="space-y-1 text-xs text-stone-500 italic py-2">
                            <p>🔒 Customer details masked for privacy compliance.</p>
                            <p className="font-mono">Phone: +91 ******3210</p>
                            <p>Address: [Full doorstep address unlocks upon verified shop pickup]</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-stone-900">{task.customerName}</p>
                            <p className="text-xs text-stone-600">{task.customerAddress}</p>
                            <p className="text-xs text-stone-700 font-mono">📞 {task.customerPhone}</p>

                            {isOutForDelivery && (
                              <div className="pt-2 border-t border-teal-200/60 space-y-2">
                                <label className="text-xs font-bold text-teal-900 block">
                                  Enter Customer Doorstep Delivery OTP:
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    maxLength={4}
                                    placeholder="4-digit OTP"
                                    value={enteredOtp[task.id] || ''}
                                    onChange={(e) =>
                                      setEnteredOtp((prev) => ({ ...prev, [task.id]: e.target.value }))
                                    }
                                    className="w-36 px-3 py-1.5 text-sm border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-center tracking-widest font-bold"
                                  />
                                  <button
                                    onClick={() => handleConfirmDelivery(task)}
                                    className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                                  >
                                    Confirm Handover
                                  </button>
                                </div>
                                {otpError[task.id] && (
                                  <p className="text-xs text-red-600 font-semibold">{otpError[task.id]}</p>
                                )}
                                <p className="text-[10px] text-teal-800/80 italic">
                                  Demo Helper: Customer OTP is <span className="font-mono font-bold text-teal-950">{task.deliveryOtp}</span>
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Flow Trigger Buttons */}
                    <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-end gap-3">
                      {task.status === 'ASSIGNED' && (
                        <button
                          onClick={() => handleAccept(task.id)}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                        >
                          Accept Assignment
                        </button>
                      )}

                      {task.status === 'PICKED_UP' && (
                        <button
                          onClick={() => handleDepart(task.id)}
                          className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                        >
                          Depart for Customer (Out for Delivery)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* History Tab */
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-stone-900">Completed & Handed-Over Deliveries</h3>
            {completedDeliveries.length === 0 ? (
              <p className="text-xs text-stone-500">No completed deliveries yet.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {completedDeliveries.map((del) => (
                  <div key={del.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-stone-800">{del.orderNumber}</span>
                      <p className="text-stone-500 text-[11px] mt-0.5">
                        {del.shopName} ➔ {del.customerName} (Jaipur)
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-stone-700 font-bold">₹{del.totalAmount}</span>
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-md uppercase text-[10px]">
                        {del.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
