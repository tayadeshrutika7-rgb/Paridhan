import { z } from 'zod';

export const UserRoleSchema = z.enum(['CONSUMER', 'SELLER', 'DELIVERY_PARTNER', 'ADMIN']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format (e.g. +919876543210)').optional().nullable(),
  role: UserRoleSchema.default('CONSUMER'),
});
export type RegisterDto = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const PhoneOtpSendSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format (e.g. +919876543210)'),
});
export type PhoneOtpSendDto = z.infer<typeof PhoneOtpSendSchema>;

export const PhoneOtpVerifySchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format (e.g. +919876543210)'),
  token: z.string().min(4, 'OTP token is required'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  role: UserRoleSchema.default('CONSUMER').optional(),
});
export type PhoneOtpVerifyDto = z.infer<typeof PhoneOtpVerifySchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  token: z.string().min(1, 'Reset token is required').optional(),
});
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format').optional().nullable(),
  avatarUrl: z.string().url('Invalid avatar URL').optional().nullable(),
});
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

export const AddressSchema = z.object({
  label: z.string().min(1, 'Address label is required (e.g. Home, Work)'),
  recipientName: z.string().min(2, 'Recipient name is required'),
  phone: z.string().min(10, 'Valid 10-digit phone number is required'),
  addressLine1: z.string().min(5, 'Address line 1 is required'),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Must be a valid 6-digit Indian PIN code'),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  isDefault: z.boolean().default(false),
});
export type AddressDto = z.infer<typeof AddressSchema>;

export const UpdateAddressSchema = AddressSchema.partial();
export type UpdateAddressDto = z.infer<typeof UpdateAddressSchema>;

// --- Phase 3: Shops ---
export const ShopCreateSchema = z.object({
  name: z.string().min(2, 'Shop name must be at least 2 characters'),
  description: z.string().max(1000).optional().nullable(),
  addressLine1: z.string().min(5, 'Address line 1 is required'),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'PIN code must be 6 digits'),
  latitude: z.number().min(-90).max(90).default(26.9124),
  longitude: z.number().min(-180).max(180).default(75.7873),
  phone: z.string().min(10, 'Phone number is required'),
  isBargainingEnabled: z.boolean().default(true),
  logoUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
});
export type ShopCreateDto = z.infer<typeof ShopCreateSchema>;

export const ShopUpdateSchema = ShopCreateSchema.partial();
export type ShopUpdateDto = z.infer<typeof ShopUpdateSchema>;

// --- Phase 3: Variants & Products ---
export const ProductVariantCreateSchema = z.object({
  sku: z.string().min(3, 'SKU is required'),
  size: z.string().min(1, 'Size is required (e.g. S, M, L, XL, Free)'),
  color: z.string().min(1, 'Color is required'),
  price: z.number().positive('Price must be greater than 0'),
  stockQuantity: z.number().int().nonnegative('Stock quantity must be 0 or greater').default(0),
  isActive: z.boolean().default(true),
});
export type ProductVariantCreateDto = z.infer<typeof ProductVariantCreateSchema>;

export const ProductVariantUpdateSchema = ProductVariantCreateSchema.partial();
export type ProductVariantUpdateDto = z.infer<typeof ProductVariantUpdateSchema>;

export const ProductCreateSchema = z.object({
  shopId: z.string().uuid('Invalid shop ID').optional(),
  categoryId: z.string().uuid('Invalid category ID'),
  subcategoryId: z.string().uuid('Invalid subcategory ID').optional().nullable(),
  brandId: z.string().uuid('Invalid brand ID').optional().nullable(),
  name: z.string().min(3, 'Product name is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  basePrice: z.number().positive('Base price must be greater than 0'),
  isBargainingAllowed: z.boolean().default(true),
  minBargainPrice: z.number().positive().optional().nullable(),
  variants: z.array(ProductVariantCreateSchema).min(1, 'At least one variant (size/color) is required'),
  images: z.array(z.string().url()).optional(),
});
export type ProductCreateDto = z.infer<typeof ProductCreateSchema>;

export const ProductUpdateSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  basePrice: z.number().positive().optional(),
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().optional().nullable(),
  brandId: z.string().uuid().optional().nullable(),
  isBargainingAllowed: z.boolean().optional(),
  minBargainPrice: z.number().positive().optional().nullable(),
  status: z.enum(['ACTIVE', 'PENDING_REVIEW', 'REJECTED', 'ARCHIVED']).optional(),
});
export type ProductUpdateDto = z.infer<typeof ProductUpdateSchema>;

// --- Phase 3: Inventory ---
export const InventoryAdjustmentSchema = z.object({
  variantId: z.string().uuid('Invalid variant ID'),
  quantityChange: z.number().int(),
  reason: z.enum(['RESTOCK', 'SALE', 'ADJUSTMENT', 'RETURN', 'DAMAGED']).default('RESTOCK'),
  referenceId: z.string().optional().nullable(),
});
export type InventoryAdjustmentDto = z.infer<typeof InventoryAdjustmentSchema>;

// --- Phase 4: Search & Location Schemas ---
export const SearchSortOptionSchema = z.enum([
  'RELEVANCE',
  'PRICE_ASC',
  'PRICE_DESC',
  'RATING_DESC',
  'DISTANCE_ASC',
  'NEWEST',
]);
export type SearchSortOption = z.infer<typeof SearchSortOptionSchema>;

export const MarketplaceSearchSchema = z.object({
  query: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  shopId: z.string().uuid().optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().positive().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  minRating: z.number().min(0).max(5).optional(),
  inStockOnly: z.boolean().default(false).optional(),
  isBargainingAllowed: z.boolean().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radiusKm: z.number().positive().max(100).default(25).optional(),
  sortBy: SearchSortOptionSchema.default('RELEVANCE').optional(),
  page: z.number().int().positive().default(1).optional(),
  limit: z.number().int().positive().max(100).default(20).optional(),
});
export type MarketplaceSearchDto = z.infer<typeof MarketplaceSearchSchema>;

export const NearbyShopsSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusKm: z.number().positive().max(100).default(25).optional(),
  limit: z.number().int().positive().max(50).default(20).optional(),
});
export type NearbyShopsDto = z.infer<typeof NearbyShopsSchema>;

export const ProductFilterSchema = z.object({
  shopId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  search: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  inStockOnly: z.boolean().optional(),
});
export type ProductFilterDto = z.infer<typeof ProductFilterSchema>;

// --- Commerce Schemas (Phases 5 & 6) ---
export const CartItemAddSchema = z.object({
  productId: z.string().uuid('Invalid product ID').optional(),
  variantId: z.string().uuid('Invalid variant ID'),
  quantity: z.number().int().positive('Quantity must be at least 1').max(10, 'Max 10 per item allowed'),
  bargainingSessionId: z.string().uuid().optional().nullable(),
});
export type CartItemAddDto = z.infer<typeof CartItemAddSchema>;

export const CartItemUpdateSchema = z.object({
  quantity: z.number().int().min(0, 'Quantity cannot be negative').max(10, 'Max 10 per item allowed'),
});
export type CartItemUpdateDto = z.infer<typeof CartItemUpdateSchema>;

export const WishlistToggleSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
});
export type WishlistToggleDto = z.infer<typeof WishlistToggleSchema>;

// --- Bargaining Schemas (Phase 7) ---
export const BargainingSessionCreateSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  variantId: z.string().uuid('Invalid variant ID'),
  initialOffer: z.number().positive('Initial offer must be greater than 0'),
  message: z.string().max(500).optional().nullable(),
});
export type BargainingSessionCreateDto = z.infer<typeof BargainingSessionCreateSchema>;

export const BargainingOfferSubmitSchema = z.object({
  amount: z.number().positive('Offer amount must be greater than 0'),
  message: z.string().max(500).optional().nullable(),
});
export type BargainingOfferSubmitDto = z.infer<typeof BargainingOfferSubmitSchema>;

export const BargainingActionSchema = z.object({
  offerId: z.string().uuid('Invalid offer ID').optional().nullable(),
  reason: z.string().max(500).optional().nullable(),
});
export type BargainingActionDto = z.infer<typeof BargainingActionSchema>;

export const BargainingOfferSchema = z.object({
  sessionId: z.string().uuid('Invalid bargaining session ID'),
  amount: z.number().positive('Offer amount must be greater than 0'),
  message: z.string().max(500).optional().nullable(),
});
export type BargainingOfferDto = z.infer<typeof BargainingOfferSchema>;

export const CheckoutSchema = z.object({
  addressId: z.string().uuid('Delivery address is required'),
  paymentMethod: z.enum(['ONLINE_RAZORPAY', 'CASH_ON_DELIVERY']),
  deliveryNotes: z.string().max(500).optional().nullable(),
});
export type CheckoutDto = z.infer<typeof CheckoutSchema>;

export const RazorpayVerifySchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  razorpayOrderId: z.string().min(1, 'Razorpay order ID is required'),
  razorpayPaymentId: z.string().min(1, 'Razorpay payment ID is required'),
  razorpaySignature: z.string().min(1, 'Razorpay signature is required'),
});
export type RazorpayVerifyDto = z.infer<typeof RazorpayVerifySchema>;

export const OrderStatusUpdateSchema = z.object({
  status: z.enum([
    'PENDING_PAYMENT',
    'CONFIRMED',
    'PREPARING',
    'READY_FOR_PICKUP',
    'PICKED_UP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'FAILED',
  ]),
  notes: z.string().max(500).optional().nullable(),
  cancellationReason: z.string().max(500).optional().nullable(),
});
export type OrderStatusUpdateDto = z.infer<typeof OrderStatusUpdateSchema>;

// --- Delivery Schemas (Phase 8) ---
export const DeliveryAssignSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  deliveryPartnerId: z.string().uuid('Invalid delivery partner ID'),
});
export type DeliveryAssignDto = z.infer<typeof DeliveryAssignSchema>;

export const DeliveryConfirmPickupSchema = z.object({
  pickupOtp: z.string().min(4, 'Pickup OTP must be at least 4 digits').max(6),
  notes: z.string().max(500).optional().nullable(),
});
export type DeliveryConfirmPickupDto = z.infer<typeof DeliveryConfirmPickupSchema>;

export const DeliveryConfirmDeliverySchema = z.object({
  deliveryOtp: z.string().min(4, 'Delivery OTP must be at least 4 digits').max(6),
  proofOfDeliveryUrl: z.string().url().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});
export type DeliveryConfirmDeliveryDto = z.infer<typeof DeliveryConfirmDeliverySchema>;

export const DeliveryFailureReportSchema = z.object({
  reason: z.string().min(3, 'Failure reason must be specified').max(500),
  notes: z.string().max(500).optional().nullable(),
});
export type DeliveryFailureReportDto = z.infer<typeof DeliveryFailureReportSchema>;

// --- Admin Schemas (Phase 11) ---
export const AdminVerifyShopSchema = z.object({
  status: z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED']),
  rejectionReason: z.string().max(500).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});
export type AdminVerifyShopDto = z.infer<typeof AdminVerifyShopSchema>;

export const AdminModerateProductSchema = z.object({
  status: z.enum(['ACTIVE', 'PENDING_REVIEW', 'REJECTED', 'ARCHIVED']),
  moderationNotes: z.string().max(500).optional().nullable(),
});
export type AdminModerateProductDto = z.infer<typeof AdminModerateProductSchema>;

export const AdminUpdateUserRoleSchema = z.object({
  role: z.enum(['CONSUMER', 'SELLER', 'DELIVERY_PARTNER', 'ADMIN']),
});
export type AdminUpdateUserRoleDto = z.infer<typeof AdminUpdateUserRoleSchema>;

export const AdminSuspendUserSchema = z.object({
  isSuspended: z.boolean(),
  reason: z.string().max(500).optional().nullable(),
});
export type AdminSuspendUserDto = z.infer<typeof AdminSuspendUserSchema>;

export const AdminResolveComplaintSchema = z.object({
  status: z.enum(['PENDING', 'UNDER_INVESTIGATION', 'RESOLVED', 'DISMISSED']),
  resolutionNotes: z.string().min(3, 'Resolution notes required').max(1000),
});
export type AdminResolveComplaintDto = z.infer<typeof AdminResolveComplaintSchema>;

export const AdminUpdateSettingSchema = z.object({
  value: z.any(),
  description: z.string().max(500).optional().nullable(),
});
export type AdminUpdateSettingDto = z.infer<typeof AdminUpdateSettingSchema>;

export const AdminPrivilegedCancelOrderSchema = z.object({
  reason: z.string().min(3, 'Cancellation reason required').max(500),
  refundAmount: z.number().nonnegative().optional().nullable(),
});
export type AdminPrivilegedCancelOrderDto = z.infer<typeof AdminPrivilegedCancelOrderSchema>;


