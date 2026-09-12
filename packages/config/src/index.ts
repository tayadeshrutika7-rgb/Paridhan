export const APP_CONFIG = {
  name: 'PARIDHAN',
  tagline: 'Wear Local. Support Local.',
  version: '0.1.0',
  currency: {
    code: 'INR',
    symbol: '₹',
    locale: 'en-IN',
  },
  bargaining: {
    sessionExpiryHours: 24,
    maxRoundsPerSession: 5,
    minOfferPercentage: 50,
  },
  delivery: {
    defaultRadiusKm: 15,
    defaultFeeInr: 49,
    freeDeliveryThresholdInr: 999,
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
  storage: {
    buckets: {
      productImages: 'product-images',
      shopImages: 'shop-images',
      avatars: 'avatars',
      reviewImages: 'review-images',
    },
    maxFileSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedImageMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
