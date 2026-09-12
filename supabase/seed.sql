-- ============================================================
-- PARIDHAN: Complete Realistic Seed Data for Local Development
-- Phase 1 Foundation
-- ============================================================

-- 1. Roles & Permissions
INSERT INTO public.roles (id, name, description) VALUES
  ('CONSUMER', 'Consumer', 'Standard platform shopper'),
  ('SELLER', 'Seller', 'Verified shop owner / clothing merchant'),
  ('DELIVERY_PARTNER', 'Delivery Partner', 'Local delivery rider'),
  ('ADMIN', 'Platform Administrator', 'Full management and moderation privileges')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.permissions (id, resource, action, description) VALUES
  ('shops:read', 'shops', 'read', 'View shops'),
  ('shops:manage', 'shops', 'manage', 'Create and update own shop'),
  ('products:manage', 'products', 'manage', 'Create and update own products'),
  ('orders:manage', 'orders', 'manage', 'Update order fulfillment status'),
  ('admin:all', 'platform', 'admin', 'Full platform control')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  ('CONSUMER', 'shops:read'),
  ('SELLER', 'shops:read'),
  ('SELLER', 'shops:manage'),
  ('SELLER', 'products:manage'),
  ('SELLER', 'orders:manage'),
  ('ADMIN', 'admin:all')
ON CONFLICT DO NOTHING;

-- 2. Categories & Subcategories
INSERT INTO public.categories (id, name, slug, icon) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Men''s Wear', 'mens-wear', 'shirt'),
  ('11111111-1111-1111-1111-111111111102', 'Women''s Wear', 'womens-wear', 'dress'),
  ('11111111-1111-1111-1111-111111111103', 'Ethnic & Festive', 'ethnic-and-festive', 'sparkles'),
  ('11111111-1111-1111-1111-111111111104', 'Casual & Western', 'casual-and-western', 'smile'),
  ('11111111-1111-1111-1111-111111111105', 'Kids & Teens', 'kids-and-teens', 'heart')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subcategories (id, category_id, name, slug) VALUES
  ('11111111-2222-1111-1111-111111111101', '11111111-1111-1111-1111-111111111101', 'Formal Shirts', 'formal-shirts'),
  ('11111111-2222-1111-1111-111111111102', '11111111-1111-1111-1111-111111111101', 'Kurta & Pyjama', 'kurta-pyjama'),
  ('11111111-2222-1111-1111-111111111103', '11111111-1111-1111-1111-111111111102', 'Banarasi Sarees', 'banarasi-sarees'),
  ('11111111-2222-1111-1111-111111111104', '11111111-1111-1111-1111-111111111102', 'Anarkali Suits', 'anarkali-suits'),
  ('11111111-2222-1111-1111-111111111105', '11111111-1111-1111-1111-111111111103', 'Bridal Lehengas', 'bridal-lehengas')
ON CONFLICT (id) DO NOTHING;

-- 3. Brands
INSERT INTO public.brands (id, name, slug, logo_url) VALUES
  ('22222222-2222-2222-2222-222222222201', 'Khadi Crafts', 'khadi-crafts', 'https://images.unsplash.com/photo-1598032895397-b9472444bf93?w=100'),
  ('22222222-2222-2222-2222-222222222202', 'Varanasi Silks', 'varanasi-silks', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=100'),
  ('22222222-2222-2222-2222-222222222203', 'Jaipur Handlooms', 'jaipur-handlooms', 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=100')
ON CONFLICT (id) DO NOTHING;

-- 4. Platform Settings
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('commission_rate', '{"standard_percent": 5.0, "promotional_percent": 3.0}', 'Platform commission percentage'),
  ('bargaining_rules', '{"max_rounds": 5, "min_offer_percent": 50, "expiry_hours": 24}', 'Default bargaining parameters'),
  ('delivery_config', '{"default_radius_km": 15, "base_fee": 49, "free_threshold": 999}', 'Local delivery rates and thresholds')
ON CONFLICT (key) DO NOTHING;
