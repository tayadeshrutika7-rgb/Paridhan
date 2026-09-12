# PARIDHAN API Specification

## 1. Conventions

- Base URL: `/api/v1`
- Content Type: `application/json`
- Auth Header: `Authorization: Bearer <Supabase_JWT_Token>`
- Documentation: Swagger UI accessible at `/api/docs`

## 2. Standard Response Format

```json
{
  "success": true,
  "data": {},
  "message": "Optional message",
  "timestamp": "2026-09-08T10:00:00.000Z"
}
```

## 3. Core Module Endpoints

### Health Check
- `GET /api/v1/health` — Platform and service health check

### Auth & User Profile (Phase 1)
- `POST /api/v1/auth/sync-profile` — Sync Supabase auth user with application database
- `GET /api/v1/users/me` — Current user profile
- `PUT /api/v1/users/me` — Update user profile
- `GET /api/v1/users/addresses` — User address list

### Shops & Products (Phase 2)
- `GET /api/v1/shops` — Nearby shop discovery (filtered by lat/lng/radius)
- `GET /api/v1/shops/:id` — Shop details & active catalog
- `GET /api/v1/products` — Product search & filtering
- `GET /api/v1/products/:id` — Product detail with variants and stock

### Cart & Shopping (Phase 3)
- `GET /api/v1/cart` — User cart with real-time stock validation
- `POST /api/v1/cart/items` — Add variant to cart
- `DELETE /api/v1/cart/items/:id` — Remove item from cart

### Orders & Payments (Phase 4)
- `POST /api/v1/orders` — Server-side checkout & inventory reservation
- `GET /api/v1/orders` — Order history
- `POST /api/v1/payments/razorpay/create` — Create Razorpay order
- `POST /api/v1/payments/razorpay/webhook` — Razorpay webhook verification

### Bargaining (Phase 5)
- `POST /api/v1/bargaining/sessions` — Start negotiation session
- `POST /api/v1/bargaining/sessions/:id/offers` — Submit offer/counter-offer
- `POST /api/v1/bargaining/sessions/:id/accept` — Accept offer & lock price
