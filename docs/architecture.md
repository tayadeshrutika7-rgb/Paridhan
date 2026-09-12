# PARIDHAN System Architecture

## 1. High-Level Architecture Overview

PARIDHAN is a hyper-local clothing marketplace powered by a modular monolith backend and multi-platform clients.

```
                         PARIDHAN
                             |
              +--------------+--------------+
              |                             |
          WEB APP                       MOBILE APP
     (Next.js App Router)         (React Native / Expo)
              |                             |
              +--------------+--------------+
                             |
                         REST API
                             |
                   NestJS (Modular Monolith)
                             |
        +--------------------+--------------------+
        |                    |                    |
   Auth Module          Marketplace          Order & Bargain
   (Supabase Auth)         Module                Module
        |                    |                    |
        +--------------------+--------------------+
                             |
                 Supabase (PostgreSQL / Auth / Storage)
                             |
          +------------------+------------------+
          |         |         |        |         |
        Redis   Supabase   Razorpay  Maps      AI
                 Storage                        |
          |                             External APIs
     Notifications
```

## 2. Platform Components

- **Backend (`apps/api`)**: NestJS TypeScript modular monolith delivering versioned REST endpoints (`/api/v1/*`). Authoritative source of truth for all business operations, pricing, inventory, order state machine, and bargaining logic.
- **Database & Data Platform**: Supabase PostgreSQL single source of truth, managed via SQL migrations (`supabase/migrations/`) and accessed via `@supabase/supabase-js` using the server-side service-role key.
- **Web App (`apps/web`)**: Next.js App Router application with Tailwind CSS and TanStack Query.
- **Mobile App (`apps/mobile`)**: React Native Expo application with Expo Router.
- **Shared Packages (`packages/*`)**: `@paridhan/types`, `@paridhan/validation`, `@paridhan/config`.
