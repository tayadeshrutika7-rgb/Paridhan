# PARIDHAN Security Architecture

## 1. Principles

1. **Backend as Single Source of Truth**: Never trust client-supplied prices, roles, user identities, inventory counts, or payment verification statuses.
2. **Service-Role Isolation**: The Supabase service-role key is strictly confined to server-side NestJS environment variables. Never leak or bundle it into web or mobile client builds.
3. **Public Client Safety**: Web and mobile clients strictly use the public `SUPABASE_ANON_KEY`.
4. **Row Level Security (RLS)**: Defense-in-depth on all PostgreSQL tables.
5. **Token Verification**: NestJS `SupabaseAuthGuard` verifies Supabase JWT signatures and expiration on all protected routes.
6. **Input Sanitization**: Strict schema validation using Zod and class-validator.
7. **Rate Limiting & Security Headers**: Helmet and Redis throttling on sensitive endpoints.
