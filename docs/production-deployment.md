# Production Deployment & Hardening Runbook

This document details the production infrastructure, deployment architecture, security hardening, and disaster recovery strategy for the **PARIDHAN** hyper-local fashion marketplace.

---

## 1. System Architecture

```text
                                  [ Cloudflare DNS & DDoS Shield ]
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        ▼                                                 ▼
             [ Web Frontend (Next.js) ]                         [ Backend API (NestJS) ]
                  Hosted on Vercel                              Hosted on AWS ECS / Fly.io
                        │                                                 │
                        ├─────────────────────────────────────────────────┤
                        ▼                                                 ▼
           [ Supabase PostgreSQL + Auth ]                       [ Supabase Storage ]
             Managed DB (RLS + Pooling)                            Encrypted Buckets
```

---

## 2. Infrastructure Components

### A. Web Application (`apps/web`)
- **Hosting Platform**: Vercel.
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: `https://api.paridhan.com/api/v1`
  - `NEXT_PUBLIC_SUPABASE_URL`: `https://[project-ref].supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `[anon-key]`
  - `NEXT_PUBLIC_GOOGLE_MAPS_KEY`: `[google-maps-api-key]`
- **Build Command**: `pnpm --filter @paridhan/web build`

### B. Backend API (`apps/api`)
- **Hosting Platform**: Managed Node.js Container (AWS ECS / Fly.io / DigitalOcean App Platform).
- **Docker Image**: Multi-stage lightweight `node:20-alpine` build ([`apps/api/Dockerfile`](file:///c:/projects/Paridhan/Paridhan/apps/api/Dockerfile)).
- **Environment Variables**:
  - `PORT`: `4000`
  - `NODE_ENV`: `production`
  - `SUPABASE_URL`: `https://[project-ref].supabase.co`
  - `SUPABASE_ANON_KEY`: `[anon-key]`
  - `SUPABASE_SERVICE_ROLE_KEY`: `[service-role-secret-key]`
  - `WEB_APP_URL`: `https://paridhan.com`
  - `RAZORPAY_KEY_ID`: `rzp_live_...`
  - `RAZORPAY_KEY_SECRET`: `[live-secret]`
  - `RAZORPAY_WEBHOOK_SECRET`: `[webhook-secret]`

### C. Database (`Supabase PostgreSQL`)
- **Connection Pooling**: Supavisor (Port 6543 for transactional connections).
- **Row-Level Security (RLS)**: Enabled across all user, order, payment, shop, and review tables.
- **Backups**: Automated daily Point-In-Time-Recovery (PITR) enabled.

### D. Object Storage (`Supabase Storage`)
- Public bucket: `product-images`, `shop-banners`.
- Private bucket: `kyc-documents`, `proof-of-delivery`.

### E. Mobile App (`apps/mobile`)
- **Build Platform**: Expo Application Services (EAS Build).
- **Submission**: Google Play Console & Apple App Store Connect via `eas submit`.

---

## 3. Security Hardening Checklist

1. **HTTP Security Headers**: `helmet` enabled with default CSP and HSTS enforcement.
2. **Rate Limiting**: Sliding window rate limiter enabled in `AppModule` restricting API traffic to 120 req/min per IP (and 20 req/min on authentication routes).
3. **CORS Restrictions**: Strict whitelist restricting API origins to production web domain (`https://paridhan.com`) and mobile bundle origins.
4. **Input Sanitization & Validation**:
   - `ValidationPipe` with `whitelist: true`, `transform: true`, `forbidNonWhitelisted: true`.
   - Zod schema validation across all DTOs in `@paridhan/validation`.
5. **Information Leakage Prevention**: Centralized `AllExceptionsFilter` masks internal database errors and stack traces in production mode.
6. **Payment Security**: Cryptographic HMAC-SHA256 signature verification enforced on all Razorpay webhooks and payment captures.
7. **Customer Privacy Masking**: Delivery endpoints progressively withhold customer address, phone number, and destination navigation links until physical shop pickup is verified.

---

## 4. Disaster Recovery & Runbook

1. **Database Failover**: Managed multi-AZ replication with automatic failover provided by Supabase.
2. **Zero-Downtime Deployments**: Rolling blue-green container deployments via Docker / ECS.
3. **Health Check Endpoint**: Continuous monitoring probing `GET /api/v1/health` every 30 seconds.
