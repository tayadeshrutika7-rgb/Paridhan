'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface CartItem {
  id: string;
  productId: string;
  title: string;
  shopName: string;
  shopDistance: string;
  size: string;
  color: string;
  price: number;
  originalPrice: number;
  bargainedPrice?: number;
  quantity: number;
  image: string;
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([
    {
      id: 'item-1',
      productId: 'p-1',
      title: 'Handloom Pure Silk Saree',
      shopName: 'Kalaniketan Silk Emporium',
      shopDistance: '1.2 km away',
      size: 'Free Size',
      color: 'Crimson Red',
      price: 4500,
      originalPrice: 4999,
      bargainedPrice: 4200,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&auto=format&fit=crop&q=60',
    },
    {
      id: 'item-2',
      productId: 'p-2',
      title: 'Slim Fit Cotton Casual Shirt',
      shopName: 'Trendz Men Fashion',
      shopDistance: '2.8 km away',
      size: 'M',
      color: 'Navy Blue',
      price: 1299,
      originalPrice: 1599,
      quantity: 2,
      image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&auto=format&fit=crop&q=60',
    },
  ]);

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = Math.max(1, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        })
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = items.reduce(
    (sum, item) => sum + (item.bargainedPrice || item.price) * item.quantity,
    0
  );
  const deliveryFee = subtotal > 1500 ? 0 : 50;
  const platformFee = 15;
  const grandTotal = subtotal + deliveryFee + platformFee;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#111827', marginBottom: '1.5rem' }}>
        🛒 Your Shopping Basket ({items.length} {items.length === 1 ? 'item' : 'items'})
      </h1>

      {items.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 1rem',
            background: '#fff',
            borderRadius: '1rem',
            border: '1px solid #e5e7eb',
          }}
        >
          <span style={{ fontSize: '3rem' }}>🛍️</span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '1rem', color: '#1f2937' }}>
            Your cart is currently empty
          </h2>
          <p style={{ color: '#6b7280', margin: '0.5rem 0 1.5rem' }}>
            Explore hyper-local boutiques around you and add exclusive styles!
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              background: '#4f46e5',
              color: '#fff',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Explore Nearby Shops
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          {/* Cart Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {items.map((item) => {
              const activePrice = item.bargainedPrice || item.price;
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    padding: '1.25rem',
                    background: '#fff',
                    borderRadius: '0.75rem',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    style={{
                      width: 96,
                      height: 110,
                      objectFit: 'cover',
                      borderRadius: '0.5rem',
                      background: '#f3f4f6',
                    }}
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <Link
                            href={`/products/${item.productId}`}
                            style={{
                              fontWeight: 700,
                              color: '#111827',
                              textDecoration: 'none',
                              fontSize: '1rem',
                            }}
                          >
                            {item.title}
                          </Link>
                          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>
                            🏪 {item.shopName} • 📍 {item.shopDistance}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#9ca3af',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                          }}
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                        <span style={{ background: '#f3f4f6', padding: '0.2rem 0.5rem', borderRadius: 4 }}>
                          Size: <strong>{item.size}</strong>
                        </span>
                        <span style={{ background: '#f3f4f6', padding: '0.2rem 0.5rem', borderRadius: 4 }}>
                          Color: <strong>{item.color}</strong>
                        </span>
                      </div>

                      {item.bargainedPrice && (
                        <div
                          style={{
                            marginTop: '0.4rem',
                            display: 'inline-block',
                            background: '#ecfdf5',
                            color: '#065f46',
                            border: '1px solid #a7f3d0',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          🤝 Bargained Special Price Accepted!
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>
                          ₹{(activePrice * item.quantity).toLocaleString('en-IN')}
                        </span>
                        {item.bargainedPrice ? (
                          <span style={{ fontSize: '0.85rem', color: '#9ca3af', textDecoration: 'line-through' }}>
                            ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                          </span>
                        ) : null}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          overflow: 'hidden',
                        }}
                      >
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          style={{
                            padding: '0.25rem 0.6rem',
                            background: '#f9fafb',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          -
                        </button>
                        <span style={{ padding: '0.25rem 0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          style={{
                            padding: '0.25rem 0.6rem',
                            background: '#f9fafb',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary Card */}
          <div style={{ alignSelf: 'start' }}>
            <div
              style={{
                background: '#fff',
                padding: '1.5rem',
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827', marginBottom: '1.25rem' }}>
                Order Summary
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                  <span>Items Subtotal</span>
                  <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                  <span>Hyper-local Delivery Fee</span>
                  <span>{deliveryFee === 0 ? <strong style={{ color: '#059669' }}>FREE</strong> : `₹${deliveryFee}`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                  <span>Platform & Safety Fee</span>
                  <span>₹{platformFee}</span>
                </div>

                <div
                  style={{
                    height: 1,
                    background: '#e5e7eb',
                    margin: '0.5rem 0',
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: '#111827',
                  }}
                >
                  <span>Grand Total</span>
                  <span style={{ color: '#4f46e5' }}>₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '0.75rem',
                  background: '#f0fdf4',
                  borderRadius: '0.5rem',
                  border: '1px solid #bbf7d0',
                  fontSize: '0.8rem',
                  color: '#166534',
                }}
              >
                ⚡ <strong>Hyper-local Guarantee:</strong> Picked up from verified local boutiques and delivered in 60-120 minutes!
              </div>

              <Link
                href="/checkout"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  marginTop: '1.5rem',
                  background: '#4f46e5',
                  color: '#fff',
                  padding: '0.85rem 1rem',
                  borderRadius: '0.5rem',
                  fontWeight: 700,
                  fontSize: '1rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
                }}
              >
                Proceed to Checkout →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
