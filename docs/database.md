# PARIDHAN Database Architecture & Schema

## 1. Overview

PARIDHAN utilizes **Supabase PostgreSQL** as its single source of truth for all application data.

- **Zero-ORM Policy**: No third-party ORMs (No Prisma, No TypeORM, No Sequelize, No Drizzle).
- **Client Integration**: `@supabase/supabase-js` is used directly in backend and clients.
- **Type Safety**: TypeScript database types generated via `supabase gen types typescript`.
- **Migrations**: SQL files managed under `supabase/migrations/`.

## 2. Core Entities & Relationships

```
Users (Linked to auth.users)
  ├── User Addresses (1:N)
  ├── Shops (1:1 / 1:N)
  │    ├── Shop Images (1:N)
  │    └── Products (1:N)
  │         ├── Product Images (1:N)
  │         ├── Product Variants (1:N)
  │         │    └── Inventory Movements (1:N)
  │         └── Reviews (1:N)
  ├── Carts (1:1) -> Cart Items (1:N)
  ├── Wishlists (1:1) -> Wishlist Items (1:N)
  ├── Bargaining Sessions (1:N) -> Bargaining Offers (1:N)
  ├── Orders (1:N)
  │    ├── Order Items (1:N)
  │    ├── Order Status History (1:N)
  │    ├── Payments (1:1)
  │    └── Deliveries (1:1) -> Delivery Status History (1:N)
  ├── Notifications (1:N)
  └── Audit Logs (1:N)
```

## 3. Row Level Security (RLS) Baseline

All tables have RLS enabled with explicit security policies ensuring data isolation between consumers, sellers, delivery partners, and admins.
