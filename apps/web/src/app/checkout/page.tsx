'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function CheckoutPage() {
  const [address, setAddress] = useState({
    name: 'Priya Sharma',
    phone: '+91 98765 43210',
    addressLine: 'Flat 402, Lotus Residency, 12th Main',
    landmark: 'Near Indiranagar Metro Station',
    city: 'Bengaluru',
    pincode: '560038',
  });

  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');

  const handlePlaceOrder = () => {
    setIsPlacingOrder(true);
    setTimeout(() => {
      const generatedId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
      setOrderId(generatedId);
      setIsPlacingOrder(false);
      setOrderPlaced(true);
    }, 1200);
  };

  const grandTotal = 6799;

  if (orderPlaced) {
    return (
      <div style={{ maxWidth: 640, margin: '4rem auto', padding: '0 1rem', textAlign: 'center' }}>
        <div
          style={{
            background: '#fff',
            padding: '3rem 2rem',
            borderRadius: '1rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              background: '#ecfdf5',
              color: '#059669',
              fontSize: '2.5rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}
          >
            ✓
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827' }}>
            Order Placed Successfully!
          </h1>
          <p style={{ color: '#4b5563', marginTop: '0.5rem', fontSize: '1rem' }}>
            Order ID: <strong>{orderId}</strong>
          </p>
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              padding: '1rem',
              margin: '1.5rem 0',
              textAlign: 'left',
              fontSize: '0.875rem',
            }}
          >
            <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
              📍 Delivery To: {address.name} ({address.phone})
            </p>
            <p style={{ color: '#64748b' }}>
              {address.addressLine}, {address.landmark}, {address.city} - {address.pincode}
            </p>
            <p style={{ color: '#0284c7', fontWeight: 600, marginTop: 8 }}>
              ⚡ Status: Assigned to Local Delivery Partner (ETA: 45 mins)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link
              href="/delivery"
              style={{
                background: '#0284c7',
                color: '#fff',
                padding: '0.75rem 1.25rem',
                borderRadius: '0.5rem',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: '0.9rem',
              }}
            >
              Track in Delivery Portal →
            </Link>
            <Link
              href="/"
              style={{
                background: '#f3f4f6',
                color: '#374151',
                padding: '0.75rem 1.25rem',
                borderRadius: '0.5rem',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: '0.9rem',
              }}
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#111827', marginBottom: '1.5rem' }}>
        🛍️ Secure Checkout
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Left Column: Delivery Address & Payment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Address Card */}
          <div
            style={{
              background: '#fff',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb',
            }}
          >
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>
              1. Delivery Doorstep Address
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', marginBottom: 4 }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={address.name}
                  onChange={(e) => setAddress({ ...address, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', marginBottom: 4 }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', marginBottom: 4 }}>
                Street Address / Flat / Building
              </label>
              <input
                type="text"
                value={address.addressLine}
                onChange={(e) => setAddress({ ...address, addressLine: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', marginBottom: 4 }}>
                  Landmark
                </label>
                <input
                  type="text"
                  value={address.landmark}
                  onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', marginBottom: 4 }}>
                  City
                </label>
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', marginBottom: 4 }}>
                  Pincode
                </label>
                <input
                  type="text"
                  value={address.pincode}
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Payment Method Card */}
          <div
            style={{
              background: '#fff',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb',
            }}
          >
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>
              2. Payment Method
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: `2px solid ${paymentMethod === 'razorpay' ? '#4f46e5' : '#e5e7eb'}`,
                  background: paymentMethod === 'razorpay' ? '#f5f3ff' : '#fff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'razorpay'}
                  onChange={() => setPaymentMethod('razorpay')}
                />
                <div>
                  <div style={{ fontWeight: 700, color: '#111827' }}>⚡ Razorpay Instant UPI & Cards</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    Google Pay, PhonePe, Paytm, Cards, NetBanking (Encrypted & Verified)
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: `2px solid ${paymentMethod === 'cod' ? '#4f46e5' : '#e5e7eb'}`,
                  background: paymentMethod === 'cod' ? '#f5f3ff' : '#fff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                />
                <div>
                  <div style={{ fontWeight: 700, color: '#111827' }}>💵 Cash on Delivery (COD)</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    Pay at your doorstep after inspecting the order
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Order Review & Pay */}
        <div>
          <div
            style={{
              background: '#fff',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>
              Order Review
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Handloom Pure Silk Saree (x1)</span>
                <span>₹4,200</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Slim Fit Cotton Casual Shirt (x2)</span>
                <span>₹2,598</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                <span>Delivery (Free above ₹1,500)</span>
                <span>FREE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Safety & Platform Fee</span>
                <span>₹15</span>
              </div>

              <div style={{ height: 1, background: '#e5e7eb', margin: '0.5rem 0' }} />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: '#111827',
                }}
              >
                <span>Total Payable</span>
                <span style={{ color: '#4f46e5' }}>₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder}
              style={{
                width: '100%',
                marginTop: '1.5rem',
                background: isPlacingOrder ? '#9ca3af' : '#4f46e5',
                color: '#fff',
                padding: '0.9rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: 700,
                fontSize: '1rem',
                border: 'none',
                cursor: isPlacingOrder ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
              }}
            >
              {isPlacingOrder ? '⏳ Processing Order...' : `Confirm & Pay ₹${grandTotal.toLocaleString('en-IN')}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
