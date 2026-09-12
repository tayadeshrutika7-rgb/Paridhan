export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'CONSUMER' | 'SELLER' | 'DELIVERY_PARTNER' | 'ADMIN';

export type ShopStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

export type ProductStatus = 'ACTIVE' | 'PENDING_REVIEW' | 'REJECTED' | 'ARCHIVED';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';

export type PaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'PAID'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type PaymentMethod = 'ONLINE_RAZORPAY' | 'CASH_ON_DELIVERY';

export type BargainingStatus = 'OPEN' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED';

export type DeliveryStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export type ComplaintStatus = 'PENDING' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'DISMISSED';

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          resource: string;
          action: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          resource: string;
          action: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          resource?: string;
          action?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
        };
        Update: {
          role_id?: string;
          permission_id?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string;
          phone: string | null;
          full_name: string;
          role: UserRole;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          phone?: string | null;
          full_name: string;
          role?: UserRole;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          phone?: string | null;
          full_name?: string;
          role?: UserRole;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_sessions: {
        Row: {
          id: string;
          user_id: string;
          refresh_token_hash: string | null;
          ip_address: string | null;
          user_agent: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          refresh_token_hash?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          refresh_token_hash?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          recipient_name: string;
          phone: string;
          address_line1: string;
          address_line2: string | null;
          city: string;
          state: string;
          pincode: string;
          latitude: number | null;
          longitude: number | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string;
          recipient_name: string;
          phone: string;
          address_line1: string;
          address_line2?: string | null;
          city: string;
          state: string;
          pincode: string;
          latitude?: number | null;
          longitude?: number | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          recipient_name?: string;
          phone?: string;
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          state?: string;
          pincode?: string;
          latitude?: number | null;
          longitude?: number | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      seller_profiles: {
        Row: {
          id: string;
          user_id: string;
          business_name: string;
          gstin: string | null;
          pan_number: string | null;
          bank_account_number: string | null;
          bank_ifsc: string | null;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_name: string;
          gstin?: string | null;
          pan_number?: string | null;
          bank_account_number?: string | null;
          bank_ifsc?: string | null;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          business_name?: string;
          gstin?: string | null;
          pan_number?: string | null;
          bank_account_number?: string | null;
          bank_ifsc?: string | null;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shops: {
        Row: {
          id: string;
          seller_id: string;
          seller_profile_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          address_line1: string;
          address_line2: string | null;
          city: string;
          state: string;
          pincode: string;
          latitude: number;
          longitude: number;
          phone: string;
          status: ShopStatus;
          rating: number;
          review_count: number;
          is_bargaining_enabled: boolean;
          logo_url: string | null;
          banner_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          seller_profile_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          address_line1: string;
          address_line2?: string | null;
          city: string;
          state: string;
          pincode: string;
          latitude: number;
          longitude: number;
          phone: string;
          status?: ShopStatus;
          rating?: number;
          review_count?: number;
          is_bargaining_enabled?: boolean;
          logo_url?: string | null;
          banner_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          seller_profile_id?: string | null;
          name?: string;
          slug?: string;
          description?: string | null;
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          state?: string;
          pincode?: string;
          latitude?: number;
          longitude?: number;
          phone?: string;
          status?: ShopStatus;
          rating?: number;
          review_count?: number;
          is_bargaining_enabled?: boolean;
          logo_url?: string | null;
          banner_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shop_images: {
        Row: {
          id: string;
          shop_id: string;
          image_url: string;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          image_url: string;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          image_url?: string;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          icon: string | null;
          parent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          icon?: string | null;
          parent_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          icon?: string | null;
          parent_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      subcategories: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      brands: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          shop_id: string;
          category_id: string;
          subcategory_id: string | null;
          brand_id: string | null;
          name: string;
          slug: string;
          description: string;
          base_price: number;
          status: ProductStatus;
          is_bargaining_allowed: boolean;
          min_bargain_price: number | null;
          rating: number;
          review_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          category_id: string;
          subcategory_id?: string | null;
          brand_id?: string | null;
          name: string;
          slug: string;
          description: string;
          base_price: number;
          status?: ProductStatus;
          is_bargaining_allowed?: boolean;
          min_bargain_price?: number | null;
          rating?: number;
          review_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          category_id?: string;
          subcategory_id?: string | null;
          brand_id?: string | null;
          name?: string;
          slug?: string;
          description?: string;
          base_price?: number;
          status?: ProductStatus;
          is_bargaining_allowed?: boolean;
          min_bargain_price?: number | null;
          rating?: number;
          review_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          image_url: string;
          display_order: number;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          image_url: string;
          display_order?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          image_url?: string;
          display_order?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          sku: string;
          size: string;
          color: string;
          price: number;
          stock_quantity: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          sku: string;
          size: string;
          color: string;
          price: number;
          stock_quantity?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          sku?: string;
          size?: string;
          color?: string;
          price?: number;
          stock_quantity?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      inventory_movements: {
        Row: {
          id: string;
          variant_id: string;
          quantity_change: number;
          reason: string;
          reference_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          quantity_change: number;
          reason: string;
          reference_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          quantity_change?: number;
          reason?: string;
          reference_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      carts: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          variant_id: string;
          quantity: number;
          bargaining_session_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          variant_id: string;
          quantity?: number;
          bargaining_session_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          variant_id?: string;
          quantity?: number;
          bargaining_session_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      wishlists: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      wishlist_items: {
        Row: {
          id: string;
          wishlist_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          wishlist_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          wishlist_id?: string;
          product_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      bargaining_sessions: {
        Row: {
          id: string;
          product_id: string;
          variant_id: string;
          user_id: string;
          shop_id: string;
          original_price: number;
          agreed_price: number | null;
          status: BargainingStatus;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          variant_id: string;
          user_id: string;
          shop_id: string;
          original_price: number;
          agreed_price?: number | null;
          status?: BargainingStatus;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          variant_id?: string;
          user_id?: string;
          shop_id?: string;
          original_price?: number;
          agreed_price?: number | null;
          status?: BargainingStatus;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bargaining_offers: {
        Row: {
          id: string;
          session_id: string;
          sender_id: string;
          sender_role: UserRole;
          amount: number;
          message: string | null;
          status: OfferStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          sender_id: string;
          sender_role: UserRole;
          amount: number;
          message?: string | null;
          status?: OfferStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          sender_id?: string;
          sender_role?: UserRole;
          amount?: number;
          message?: string | null;
          status?: OfferStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string;
          shop_id: string;
          address_id: string;
          status: OrderStatus;
          payment_status: PaymentStatus;
          payment_method: PaymentMethod;
          subtotal_amount: number;
          delivery_fee: number;
          discount_amount: number;
          total_amount: number;
          bargaining_session_id: string | null;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          user_id: string;
          shop_id: string;
          address_id: string;
          status?: OrderStatus;
          payment_status?: PaymentStatus;
          payment_method: PaymentMethod;
          subtotal_amount: number;
          delivery_fee?: number;
          discount_amount?: number;
          total_amount: number;
          bargaining_session_id?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          user_id?: string;
          shop_id?: string;
          address_id?: string;
          status?: OrderStatus;
          payment_status?: PaymentStatus;
          payment_method?: PaymentMethod;
          subtotal_amount?: number;
          delivery_fee?: number;
          discount_amount?: number;
          total_amount?: number;
          bargaining_session_id?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          variant_id: string;
          product_name: string;
          size: string;
          color: string;
          unit_price: number;
          quantity: number;
          total_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          variant_id: string;
          product_name: string;
          size: string;
          color: string;
          unit_price: number;
          quantity: number;
          total_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          variant_id?: string;
          product_name?: string;
          size?: string;
          color?: string;
          unit_price?: number;
          quantity?: number;
          total_price?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      order_status_history: {
        Row: {
          id: string;
          order_id: string;
          previous_status: OrderStatus | null;
          new_status: OrderStatus;
          changed_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          previous_status?: OrderStatus | null;
          new_status: OrderStatus;
          changed_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          previous_status?: OrderStatus | null;
          new_status?: OrderStatus;
          changed_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          payment_method: PaymentMethod;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          razorpay_signature: string | null;
          amount: number;
          currency: string;
          status: PaymentStatus;
          raw_payload: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          payment_method: PaymentMethod;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          amount: number;
          currency?: string;
          status?: PaymentStatus;
          raw_payload?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          payment_method?: PaymentMethod;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          amount?: number;
          currency?: string;
          status?: PaymentStatus;
          raw_payload?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      refunds: {
        Row: {
          id: string;
          payment_id: string;
          razorpay_refund_id: string | null;
          amount: number;
          status: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          razorpay_refund_id?: string | null;
          amount: number;
          status?: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string;
          razorpay_refund_id?: string | null;
          amount?: number;
          status?: string;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      deliveries: {
        Row: {
          id: string;
          order_id: string;
          delivery_partner_id: string | null;
          status: DeliveryStatus;
          pickup_otp: string | null;
          delivery_otp: string | null;
          assigned_at: string | null;
          picked_up_at: string | null;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          delivery_partner_id?: string | null;
          status?: DeliveryStatus;
          pickup_otp?: string | null;
          delivery_otp?: string | null;
          assigned_at?: string | null;
          picked_up_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          delivery_partner_id?: string | null;
          status?: DeliveryStatus;
          pickup_otp?: string | null;
          delivery_otp?: string | null;
          assigned_at?: string | null;
          picked_up_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      delivery_status_history: {
        Row: {
          id: string;
          delivery_id: string;
          status: DeliveryStatus;
          latitude: number | null;
          longitude: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          delivery_id: string;
          status: DeliveryStatus;
          latitude?: number | null;
          longitude?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          delivery_id?: string;
          status?: DeliveryStatus;
          latitude?: number | null;
          longitude?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          product_id: string | null;
          shop_id: string;
          order_id: string | null;
          rating: number;
          title: string | null;
          comment: string | null;
          is_verified_purchase: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id?: string | null;
          shop_id: string;
          order_id?: string | null;
          rating: number;
          title?: string | null;
          comment?: string | null;
          is_verified_purchase?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string | null;
          shop_id?: string;
          order_id?: string | null;
          rating?: number;
          title?: string | null;
          comment?: string | null;
          is_verified_purchase?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          type: string;
          reference_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body: string;
          type: string;
          reference_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          body?: string;
          type?: string;
          reference_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      complaints: {
        Row: {
          id: string;
          reporter_id: string;
          target_user_id: string | null;
          shop_id: string | null;
          order_id: string | null;
          subject: string;
          description: string;
          status: ComplaintStatus;
          resolution_notes: string | null;
          resolved_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_user_id?: string | null;
          shop_id?: string | null;
          order_id?: string | null;
          subject: string;
          description: string;
          status?: ComplaintStatus;
          resolution_notes?: string | null;
          resolved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          target_user_id?: string | null;
          shop_id?: string | null;
          order_id?: string | null;
          subject?: string;
          description?: string;
          status?: ComplaintStatus;
          resolution_notes?: string | null;
          resolved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_item_type: string;
          reported_item_id: string;
          reason: string;
          details: string | null;
          status: ComplaintStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_item_type: string;
          reported_item_id: string;
          reason: string;
          details?: string | null;
          status?: ComplaintStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          reported_item_type?: string;
          reported_item_id?: string;
          reason?: string;
          details?: string | null;
          status?: ComplaintStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_conversations: {
        Row: {
          id: string;
          user_id: string | null;
          session_title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          session_title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          session_title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: string;
          content: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: string;
          content?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      search_history: {
        Row: {
          id: string;
          user_id: string | null;
          query: string;
          filters: Json | null;
          results_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          query: string;
          filters?: Json | null;
          results_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          query?: string;
          filters?: Json | null;
          results_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      recommendation_events: {
        Row: {
          id: string;
          user_id: string | null;
          event_type: string;
          product_id: string | null;
          shop_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          event_type: string;
          product_id?: string | null;
          shop_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          event_type?: string;
          product_id?: string | null;
          shop_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      platform_settings: {
        Row: {
          key: string;
          value: Json;
          description: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      user_role: UserRole;
      shop_status: ShopStatus;
      product_status: ProductStatus;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      bargaining_status: BargainingStatus;
      offer_status: OfferStatus;
      delivery_status: DeliveryStatus;
      complaint_status: ComplaintStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
