import { APP_CONFIG } from '@paridhan/config';
import { MapPin, ShoppingBag, Sparkles, MessageSquareHeart, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  const categories = [
    { name: "Men's Wear", icon: '👔', desc: 'Shirts, Kurta, Trousers & Suits' },
    { name: "Women's Wear", icon: '👗', desc: 'Sarees, Lehengas, Kurtis & Dresses' },
    { name: 'Ethnic & Festive', icon: '✨', desc: 'Handcrafted Heritage & Festive Outfits' },
    { name: 'Casual & Western', icon: '👕', desc: 'Everyday Essentials & Trendy Fits' },
  ];

  const nearbyShops = [
    {
      name: 'Varanasi Silk Emporium',
      category: 'Ethnic & Bridal',
      location: 'Chowk Market (1.2 km)',
      rating: 4.8,
      reviews: 142,
      bargain: true,
    },
    {
      name: 'Royal Heritage Handlooms',
      category: 'Festive & Kurtas',
      location: 'Civil Lines (2.5 km)',
      rating: 4.6,
      reviews: 98,
      bargain: true,
    },
    {
      name: 'Metro Trends Studio',
      category: 'Casual & Western',
      location: 'Commercial Center (3.1 km)',
      rating: 4.7,
      reviews: 64,
      bargain: false,
    },
  ];

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50/80 via-white to-stone-50 pt-16 pb-20 px-4 sm:px-6 lg:px-8 border-b border-orange-100">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100/80 border border-orange-200 text-orange-800 rounded-full text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            <span>AI-Assisted Local Fashion Marketplace</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-stone-900 tracking-tight font-serif leading-tight">
            Wear Local. <span className="text-orange-600">Support Local.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-stone-600 font-normal">
            Discover real clothing shops in your neighbourhood. Browse collections, negotiate prices
            with sellers, and enjoy seamless doorstep delivery.
          </p>

          <div className="max-w-xl mx-auto flex flex-col sm:flex-row gap-3 pt-4">
            <div className="flex-1 flex items-center bg-white border border-stone-300 rounded-xl px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-transparent">
              <MapPin className="w-5 h-5 text-orange-600 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Enter your location or PIN code..."
                className="w-full text-sm outline-none bg-transparent text-stone-800 placeholder-stone-400"
              />
            </div>
            <button className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all shrink-0">
              Explore Nearby
            </button>
          </div>
        </div>
      </section>

      {/* Value Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-4">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-2">Hyper-Local Discovery</h3>
            <p className="text-sm text-stone-600">
              See what authentic shops around your corner have in stock before stepping out of your home.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-4">
              <MessageSquareHeart className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-2">Interactive Bargaining</h3>
            <p className="text-sm text-stone-600">
              Experience the natural human shopping feel by making real offers to local shopkeepers.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-2">Secure & Verified</h3>
            <p className="text-sm text-stone-600">
              Verified local shops, secure Razorpay & COD payment options, and transparent delivery tracking.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-stone-900 font-serif">Curated Categories</h2>
            <p className="text-sm text-stone-500 mt-1">Explore popular styles from local fashion hubs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <div
              key={cat.name}
              className="group p-6 bg-white rounded-2xl border border-stone-200 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer"
            >
              <span className="text-3xl block mb-3 group-hover:scale-110 transition-transform">
                {cat.icon}
              </span>
              <h3 className="font-bold text-stone-900 group-hover:text-orange-600 transition-colors">
                {cat.name}
              </h3>
              <p className="text-xs text-stone-500 mt-1">{cat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Nearby Shops */}
      <section id="discover" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-stone-900 font-serif">Popular Nearby Stores</h2>
            <p className="text-sm text-stone-500 mt-1">Discover top-rated clothing shops around you</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {nearbyShops.map((shop) => (
            <div
              key={shop.name}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-lg text-stone-900">{shop.name}</h3>
                  {shop.bargain && (
                    <span className="shrink-0 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold rounded-md">
                      Bargaining OK
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mb-3">{shop.category}</p>
                <div className="flex items-center text-xs text-stone-600 gap-2 mb-4">
                  <MapPin className="w-3.5 h-3.5 text-orange-500" />
                  <span>{shop.location}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-stone-700 font-medium">
                  <span className="text-amber-500 font-bold">★ {shop.rating}</span>
                  <span className="text-stone-400">({shop.reviews} reviews)</span>
                </div>
              </div>
              <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
                <span className="text-xs text-stone-500">Fast Local Delivery</span>
                <span className="text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer">
                  Visit Store →
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
