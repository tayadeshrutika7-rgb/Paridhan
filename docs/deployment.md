# PARIDHAN Deployment Guide

## 1. Cloud & Managed Infrastructure

- **Database / Auth / Storage**: Supabase Managed Project (PostgreSQL, Supabase Auth, Supabase Storage).
- **Backend API (`apps/api`)**: Container or Node.js hosting (e.g. Render, Railway, AWS ECS, Google Cloud Run).
- **Web App (`apps/web`)**: Vercel / Cloudflare Pages.
- **Mobile App (`apps/mobile`)**: Expo Application Services (EAS Build / Submit).

## 2. Environment Variables Checklist

Ensure the following variables are configured in each deployment target:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Backend only)
- `SUPABASE_JWT_SECRET` (Backend only)
- `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`
- `AI_API_KEY`
- `GOOGLE_MAPS_API_KEY`
- `REDIS_URL`
