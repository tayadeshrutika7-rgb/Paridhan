'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface ShopVerificationItem {
  id: string;
  name: string;
  sellerEmail: string;
  city: string;
  address: string;
  phone: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  createdAt: string;
}

interface ProductModerationItem {
  id: string;
  name: string;
  shopName: string;
  basePrice: number;
  status: 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED' | 'ARCHIVED';
  isBargainingAllowed: boolean;
  minBargainPrice?: number;
}

interface UserAdminItem {
  id: string;
  email: string;
  fullName: string;
  role: 'CONSUMER' | 'SELLER' | 'DELIVERY_PARTNER' | 'ADMIN';
  isSuspended: boolean;
  createdAt: string;
}

interface ComplaintItem {
  id: string;
  ticketNumber: string;
  subject: string;
  userEmail: string;
  status: 'PENDING' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'DISMISSED';
  resolutionNotes?: string;
  createdAt: string;
}

interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  timestamp: string;
  notes: string;
}

const INITIAL_SHOPS: ShopVerificationItem[] = [
  {
    id: 'shop-001',
    name: 'Royal Jaipur Silks',
    sellerEmail: 'seller.jaipur@paridhan.local',
    city: 'Jaipur',
    address: 'Shop #14, Bapu Bazaar',
    phone: '+91 98290 11223',
    status: 'VERIFIED',
    createdAt: '2026-09-08',
  },
  {
    id: 'shop-002',
    name: 'Jodhpur Bandhani Heritage',
    sellerEmail: 'jodhpur.crafts@paridhan.local',
    city: 'Jodhpur',
    address: 'Sardar Market, Clock Tower',
    phone: '+91 98291 99887',
    status: 'PENDING',
    createdAt: '2026-09-11',
  },
  {
    id: 'shop-003',
    name: 'Varanasi Weavers Co.',
    sellerEmail: 'kashi.silks@paridhan.local',
    city: 'Varanasi',
    address: 'Ghat Marg, Chowk',
    phone: '+91 98390 44332',
    status: 'PENDING',
    createdAt: '2026-09-12',
  },
];

const INITIAL_PRODUCTS: ProductModerationItem[] = [
  {
    id: 'prod-001',
    name: 'Handcrafted Bandhani Silk Kurta',
    shopName: 'Royal Jaipur Silks',
    basePrice: 2000,
    status: 'ACTIVE',
    isBargainingAllowed: true,
    minBargainPrice: 1500,
  },
  {
    id: 'prod-002',
    name: 'Zari Border Banarasi Lehenga',
    shopName: 'Varanasi Weavers Co.',
    basePrice: 8500,
    status: 'PENDING_REVIEW',
    isBargainingAllowed: true,
    minBargainPrice: 7200,
  },
  {
    id: 'prod-003',
    name: 'Pure Pashmina Woolen Shawl',
    shopName: 'Jodhpur Bandhani Heritage',
    basePrice: 4200,
    status: 'PENDING_REVIEW',
    isBargainingAllowed: false,
  },
];

const INITIAL_USERS: UserAdminItem[] = [
  { id: 'usr-1', email: 'admin@paridhan.local', fullName: 'Super Administrator', role: 'ADMIN', isSuspended: false, createdAt: '2026-09-01' },
  { id: 'usr-2', email: 'seller.jaipur@paridhan.local', fullName: 'Rajendra Singh', role: 'SELLER', isSuspended: false, createdAt: '2026-09-05' },
  { id: 'usr-3', email: 'partner.rider1@paridhan.local', fullName: 'Vikram Joshi', role: 'DELIVERY_PARTNER', isSuspended: false, createdAt: '2026-09-06' },
  { id: 'usr-4', email: 'consumer.ananya@paridhan.local', fullName: 'Ananya Sharma', role: 'CONSUMER', isSuspended: false, createdAt: '2026-09-10' },
];

const INITIAL_COMPLAINTS: ComplaintItem[] = [
  {
    id: 'comp-1',
    ticketNumber: 'TKT-8921',
    subject: 'Incorrect sizing received on Silk Kurta',
    userEmail: 'consumer.ananya@paridhan.local',
    status: 'UNDER_INVESTIGATION',
    createdAt: '2026-09-12 11:30',
  },
  {
    id: 'comp-2',
    ticketNumber: 'TKT-8904',
    subject: 'Delayed merchant preparation',
    userEmail: 'rohit.verma@example.com',
    status: 'RESOLVED',
    resolutionNotes: 'Merchant contacted and item dispatched with express priority.',
    createdAt: '2026-09-11 14:15',
  },
];

const INITIAL_AUDITS: AuditLogEntry[] = [
  { id: 'aud-1', actor: 'admin@paridhan.local', action: 'VERIFY_SHOP', entity: 'Shop', entityId: 'shop-001', timestamp: '2026-09-12 14:20:10', notes: 'Verified shop documentation & physical location.' },
  { id: 'aud-2', actor: 'admin@paridhan.local', action: 'MODERATE_PRODUCT', entity: 'Product', entityId: 'prod-001', timestamp: '2026-09-12 14:21:05', notes: 'Approved product status to ACTIVE.' },
  { id: 'aud-3', actor: 'admin@paridhan.local', action: 'SETTING_UPDATE', entity: 'PlatformSettings', entityId: 'delivery_fee', timestamp: '2026-09-12 15:00:00', notes: 'Updated flat delivery fee to ₹0 for promotional launch.' },
];

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SHOPS' | 'PRODUCTS' | 'USERS' | 'COMPLAINTS' | 'AUDIT'>('OVERVIEW');
  const [shops, setShops] = useState<ShopVerificationItem[]>(INITIAL_SHOPS);
  const [products, setProducts] = useState<ProductModerationItem[]>(INITIAL_PRODUCTS);
  const [users, setUsers] = useState<UserAdminItem[]>(INITIAL_USERS);
  const [complaints, setComplaints] = useState<ComplaintItem[]>(INITIAL_COMPLAINTS);
  const [audits, setAudits] = useState<AuditLogEntry[]>(INITIAL_AUDITS);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Shop action handlers
  const handleVerifyShop = (id: string, newStatus: ShopVerificationItem['status']) => {
    setShops((prev) => prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s)));
    const entry: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      actor: 'admin@paridhan.local',
      action: `SHOP_${newStatus}`,
      entity: 'Shop',
      entityId: id,
      timestamp: new Date().toLocaleString(),
      notes: `Shop status changed to ${newStatus}`,
    };
    setAudits((prev) => [entry, ...prev]);
    setActionNotice(`Shop ${id} updated to ${newStatus}. Audit logged.`);
  };

  // Product moderation handlers
  const handleModerateProduct = (id: string, newStatus: ProductModerationItem['status']) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
    const entry: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      actor: 'admin@paridhan.local',
      action: `PRODUCT_${newStatus}`,
      entity: 'Product',
      entityId: id,
      timestamp: new Date().toLocaleString(),
      notes: `Product moderated to ${newStatus}`,
    };
    setAudits((prev) => [entry, ...prev]);
    setActionNotice(`Product ${id} status set to ${newStatus}. Audit logged.`);
  };

  // User suspension toggle
  const handleToggleSuspendUser = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const nextState = !u.isSuspended;
          const entry: AuditLogEntry = {
            id: `aud-${Date.now()}`,
            actor: 'admin@paridhan.local',
            action: nextState ? 'USER_SUSPENDED' : 'USER_REACTIVATED',
            entity: 'User',
            entityId: id,
            timestamp: new Date().toLocaleString(),
            notes: `User ${u.email} ${nextState ? 'suspended' : 'reactivated'}.`,
          };
          setAudits((prevAud) => [entry, ...prevAud]);
          return { ...u, isSuspended: nextState };
        }
        return u;
      }),
    );
    setActionNotice(`User account status updated. Audit recorded.`);
  };

  // Complaint resolution
  const handleResolveComplaint = (id: string) => {
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: 'RESOLVED' as const, resolutionNotes: 'Resolved by Administrator with buyer refund clearance.' }
          : c,
      ),
    );
    setActionNotice(`Complaint ${id} resolved.`);
  };

  return (
    <div className="min-h-screen bg-stone-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Admin Header Banner */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-indigo-950 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                ROLE: PLATFORM ADMINISTRATOR
              </span>
              <span className="text-xs text-stone-300">PARIDHAN Super-Admin Terminal</span>
            </div>
            <h1 className="text-2xl font-bold font-serif mt-1">Platform Command Dashboard</h1>
            <p className="text-sm text-stone-300/80">
              Platform governance, merchant verification, catalog moderation, dispute resolution, and security audits.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/20 transition-all"
            >
              Consumer View
            </Link>
            <Link
              href="/seller"
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/20 transition-all"
            >
              Seller View
            </Link>
            <Link
              href="/delivery"
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/20 transition-all"
            >
              Delivery View
            </Link>
          </div>
        </div>

        {/* Action toast */}
        {actionNotice && (
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-4 py-3 rounded-xl text-sm flex items-center justify-between shadow-sm">
            <span>🛡️ {actionNotice}</span>
            <button
              onClick={() => setActionNotice(null)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-900"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
          {[
            { key: 'OVERVIEW', label: '📊 Overview' },
            { key: 'SHOPS', label: `🏪 Shop Verification (${shops.filter((s) => s.status === 'PENDING').length} Pending)` },
            { key: 'PRODUCTS', label: `👗 Product Moderation (${products.filter((p) => p.status === 'PENDING_REVIEW').length} Review)` },
            { key: 'USERS', label: `👥 User Governance (${users.length})` },
            { key: 'COMPLAINTS', label: `🎫 Dispute Tickets (${complaints.filter((c) => c.status !== 'RESOLVED').length} Open)` },
            { key: 'AUDIT', label: '📜 System Audit Trail' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === tab.key
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: OVERVIEW METRICS */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Total GMV Transacted</span>
                <p className="text-2xl font-extrabold text-stone-900 mt-1">₹148,250</p>
                <span className="text-xs text-emerald-600 font-semibold">↑ +18.4% this week</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Active Verified Shops</span>
                <p className="text-2xl font-extrabold text-stone-900 mt-1">
                  {shops.filter((s) => s.status === 'VERIFIED').length} / {shops.length}
                </p>
                <span className="text-xs text-amber-600 font-semibold">{shops.filter((s) => s.status === 'PENDING').length} pending approval</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Catalog Products</span>
                <p className="text-2xl font-extrabold text-stone-900 mt-1">{products.length}</p>
                <span className="text-xs text-teal-600 font-semibold">{products.filter((p) => p.status === 'ACTIVE').length} active live</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Dispute Escalations</span>
                <p className="text-2xl font-extrabold text-stone-900 mt-1">
                  {complaints.filter((c) => c.status !== 'RESOLVED').length}
                </p>
                <span className="text-xs text-indigo-600 font-semibold">Resolution SLA: &lt; 2 hours</span>
              </div>
            </div>

            {/* Quick Actions & Platform Governance Health */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-stone-900">🛡️ Security & System Hardening Status</h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg text-emerald-900 font-semibold border border-emerald-100">
                    <span>Rate Limiter Middleware</span>
                    <span>ACTIVE (Sliding Window 100 req/min)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg text-emerald-900 font-semibold border border-emerald-100">
                    <span>Database Engine</span>
                    <span>Supabase PostgreSQL (RLS Enforced)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg text-emerald-900 font-semibold border border-emerald-100">
                    <span>Payment Gateway HMAC</span>
                    <span>Razorpay Webhooks Verified</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg text-emerald-900 font-semibold border border-emerald-100">
                    <span>Error Masking Filter</span>
                    <span>Production Masking Filter Active</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-stone-900">⚙️ Platform Core Settings</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <span className="font-medium text-stone-600">Default Radial Search Radius:</span>
                    <span className="font-bold text-stone-900">10 km</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <span className="font-medium text-stone-600">Default Flat Delivery Fee:</span>
                    <span className="font-bold text-stone-900">₹0 (Launch Promo)</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <span className="font-medium text-stone-600">Bargaining Expiry Window:</span>
                    <span className="font-bold text-stone-900">24 Hours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-stone-600">Platform Commission:</span>
                    <span className="font-bold text-stone-900">5.0%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: SHOP VERIFICATION */}
        {activeTab === 'SHOPS' && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900">Merchant Shop Verification Queue</h3>
              <span className="text-xs text-stone-500">Total Shops: {shops.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100/80 text-stone-600 uppercase font-semibold text-[11px] border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Shop Name</th>
                    <th className="py-3 px-4">Seller Email</th>
                    <th className="py-3 px-4">City / Address</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {shops.map((s) => (
                    <tr key={s.id} className="hover:bg-stone-50/50">
                      <td className="py-3 px-4 font-bold text-stone-900">{s.name}</td>
                      <td className="py-3 px-4 text-stone-600 font-mono">{s.sellerEmail}</td>
                      <td className="py-3 px-4 text-stone-600">{s.city} • {s.address}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                            s.status === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : s.status === 'SUSPENDED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {s.status !== 'VERIFIED' && (
                          <button
                            onClick={() => handleVerifyShop(s.id, 'VERIFIED')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px]"
                          >
                            Approve
                          </button>
                        )}
                        {s.status !== 'SUSPENDED' && (
                          <button
                            onClick={() => handleVerifyShop(s.id, 'SUSPENDED')}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-[11px]"
                          >
                            Suspend
                          </button>
                        )}
                        {s.status !== 'REJECTED' && s.status === 'PENDING' && (
                          <button
                            onClick={() => handleVerifyShop(s.id, 'REJECTED')}
                            className="px-2.5 py-1 bg-stone-600 hover:bg-stone-700 text-white font-bold rounded-lg text-[11px]"
                          >
                            Reject
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: PRODUCT MODERATION */}
        {activeTab === 'PRODUCTS' && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900">Product Catalog Moderation</h3>
              <span className="text-xs text-stone-500">Products: {products.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100/80 text-stone-600 uppercase font-semibold text-[11px] border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Shop</th>
                    <th className="py-3 px-4">Base Price</th>
                    <th className="py-3 px-4">Bargaining</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-stone-50/50">
                      <td className="py-3 px-4 font-bold text-stone-900">{p.name}</td>
                      <td className="py-3 px-4 text-stone-600">{p.shopName}</td>
                      <td className="py-3 px-4 font-bold text-stone-900">₹{p.basePrice}</td>
                      <td className="py-3 px-4">
                        {p.isBargainingAllowed ? (
                          <span className="text-orange-700 font-semibold">Enabled (Floor: ₹{p.minBargainPrice})</span>
                        ) : (
                          <span className="text-stone-400">Disabled</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                            p.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'PENDING_REVIEW'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {p.status !== 'ACTIVE' && (
                          <button
                            onClick={() => handleModerateProduct(p.id, 'ACTIVE')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px]"
                          >
                            Approve
                          </button>
                        )}
                        {p.status !== 'REJECTED' && (
                          <button
                            onClick={() => handleModerateProduct(p.id, 'REJECTED')}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-[11px]"
                          >
                            Reject
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: USER GOVERNANCE */}
        {activeTab === 'USERS' && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900">User Account Governance</h3>
              <span className="text-xs text-stone-500">{users.length} registered accounts</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100/80 text-stone-600 uppercase font-semibold text-[11px] border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-stone-50/50">
                      <td className="py-3 px-4">
                        <p className="font-bold text-stone-900">{u.fullName}</p>
                        <p className="text-stone-500 font-mono text-[11px]">{u.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-stone-100 border border-stone-200 text-stone-800 font-bold rounded-md text-[10px]">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.isSuspended ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold rounded text-[10px]">SUSPENDED</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">ACTIVE</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-500">{u.createdAt}</td>
                      <td className="py-3 px-4 text-right">
                        {u.role !== 'ADMIN' && (
                          <button
                            onClick={() => handleToggleSuspendUser(u.id)}
                            className={`px-3 py-1 font-bold rounded-lg text-[11px] ${
                              u.isSuspended
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                            }`}
                          >
                            {u.isSuspended ? 'Reactivate' : 'Suspend Account'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: COMPLAINTS */}
        {activeTab === 'COMPLAINTS' && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900">Customer Support & Dispute Escalations</h3>
            </div>
            <div className="divide-y divide-stone-100">
              {complaints.map((c) => (
                <div key={c.id} className="p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-stone-800">{c.ticketNumber}</span>
                      <span className="ml-2 font-bold text-stone-900 text-sm">{c.subject}</span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                        c.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <p className="text-stone-500">Submitted by: <span className="font-mono text-stone-700">{c.userEmail}</span> • {c.createdAt}</p>
                  {c.resolutionNotes && (
                    <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100 text-emerald-900">
                      <span className="font-bold">Resolution Note:</span> {c.resolutionNotes}
                    </div>
                  )}
                  {c.status !== 'RESOLVED' && (
                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        onClick={() => handleResolveComplaint(c.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs"
                      >
                        Resolve Dispute & Close Ticket
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 6: AUDIT TRAIL */}
        {activeTab === 'AUDIT' && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900">Immutable System Audit Trail</h3>
              <span className="text-xs text-stone-500">Live privileged action stream</span>
            </div>
            <div className="divide-y divide-stone-100">
              {audits.map((a) => (
                <div key={a.id} className="p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold rounded text-[10px]">
                        {a.action}
                      </span>
                      <span className="font-bold text-stone-800">{a.entity} ({a.entityId})</span>
                    </div>
                    <p className="text-stone-600">{a.notes}</p>
                    <p className="text-[11px] text-stone-400 font-mono">Actor: {a.actor}</p>
                  </div>
                  <div className="text-stone-400 font-mono text-[11px] whitespace-nowrap">
                    {a.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
