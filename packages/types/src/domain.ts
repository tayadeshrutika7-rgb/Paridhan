import {
  UserRole,
  ShopStatus,
  ProductStatus,
  OfferStatus,
} from './database.types';

export interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShopSummary {
  id: string;
  sellerId: string;
  name: string;
  slug: string;
  description: string | null;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  phone: string;
  status: ShopStatus;
  rating: number;
  reviewCount: number;
  isBargainingEnabled: boolean;
  distanceKm?: number;
}

export interface ProductSummary {
  id: string;
  shopId: string;
  shopName?: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  status: ProductStatus;
  isBargainingAllowed: boolean;
  rating: number;
  reviewCount: number;
  images?: string[];
  variants?: VariantSummary[];
}

export interface VariantSummary {
  id: string;
  productId: string;
  sku: string;
  size: string;
  color: string;
  price: number;
  stockQuantity: number;
  isActive: boolean;
}

export interface CartItemSummary {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
  shopId: string;
  shopName: string;
  bargainingSessionId?: string | null;
}

export interface BargainingOfferDto {
  id: string;
  sessionId: string;
  senderId: string;
  senderRole: UserRole;
  amount: number;
  message?: string | null;
  status: OfferStatus;
  createdAt: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  environment: string;
  version: string;
  uptimeSeconds: number;
  services: {
    database: 'healthy' | 'unhealthy';
    redis?: 'healthy' | 'unhealthy' | 'skipped';
  };
}
