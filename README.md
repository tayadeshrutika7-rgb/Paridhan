# PARIDHAN

> **"Wear Local. Support Local."**
> A hyper-local fashion marketplace connecting consumers with nearby physical clothing shops, featuring interactive price bargaining, AI-assisted fashion discovery, and doorstep delivery.

---

## 🏗️ Architecture & Tech Stack

- **Backend**: NestJS (TypeScript, Modular Monolith, Swagger at `/api/docs`)
- **Database & Auth & Storage**: Supabase (PostgreSQL, Supabase Auth, Supabase Storage, SQL Migrations, Generated Types)
- **Web App**: Next.js (App Router, TypeScript, Tailwind CSS, TanStack Query)
- **Mobile App**: React Native + Expo (Expo Router, TypeScript)
- **Shared Packages**: `@paridhan/types`, `@paridhan/validation`, `@paridhan/config`
- **Monorepo**: pnpm workspaces + Turborepo

---

## 📁 Repository Layout

```
paridhan/
├── apps/
│   ├── api/        # NestJS REST API Modular Monolith
│   ├── web/        # Next.js Consumer Marketplace & Dashboards
│   └── mobile/     # React Native Expo Mobile Application
├── packages/
│   ├── types/      # Shared domain & Supabase database types
│   ├── validation/ # Shared Zod validation schemas
│   └── config/     # Global constants, currency & storage configs
├── supabase/
│   ├── migrations/ # SQL Schema migrations
│   ├── seed.sql    # Local development demo seed data
│   └── config.toml # Supabase local CLI config
├── docs/           # Architecture, Database, API, Security, Deployment, Decisions
├── .env.example    # Environment variables template
└── turbo.json      # Turborepo task pipeline
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js >= 20.x
- pnpm >= 9.x / 12.x
- Docker & Supabase CLI (`npm install -g supabase`)

### 2. Setup Environment
```bash
cp .env.example .env
pnpm install
```

### 3. Start Local Supabase Stack
```bash
supabase start
supabase db reset
```

### 4. Run All Applications
```bash
pnpm dev
```
- **Web Client**: `http://localhost:3000`
- **API Server**: `http://localhost:4000/api/v1`
- **API Swagger Docs**: `http://localhost:4000/api/docs`
- **Supabase Studio**: `http://localhost:54323`

---

## 🚦 Phase Status

- [x] **Phase 0: Foundation Setup** (Monorepo, Supabase PostgreSQL, NestJS, Next.js, Mobile, Docs, CI)
- [ ] **Phase 1: Auth & User Management**
- [ ] **Phase 2: Shops & Product Catalog**
- [ ] **Phase 3: Shopping & Cart**
- [ ] **Phase 4: Payments & Orders**
- [ ] **Phase 5: Structured Bargaining System**
- [ ] **Phase 6: Delivery Partner Management**
- [ ] **Phase 7: Reviews & Notifications**
- [ ] **Phase 8: AI Fashion Discovery & Help Desk**
- [ ] **Phase 9: Admin Moderation & Analytics**
- [ ] **Phase 10: Production Hardening & Security Audit**