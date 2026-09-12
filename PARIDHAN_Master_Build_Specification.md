PARIDHAN
MASTER BUILD SPECIFICATION / PROJECT HANDOFF
For Antigravity Coding Agent

============================================================
0. AGENT INSTRUCTION — READ THIS FIRST
============================================================

You are the primary engineering agent responsible for designing, implementing, testing, and preparing PARIDHAN for deployment.

Build the project as a real, maintainable product — not as a static demo or a collection of disconnected mock screens.

IMPORTANT ENGINEERING RULES:
- Inspect the repository before changing anything.
- If the repository is empty, initialize the project cleanly.
- Do not create unnecessary files, duplicate implementations, speculative abstractions, or over-engineered infrastructure.
- Keep the code straightforward, modular, readable, and human-written in appearance.
- Avoid excessive comments. Add comments only where the logic is genuinely non-obvious.
- Do not implement the same business logic separately for web and mobile when it can be shared through the backend/domain packages.
- Do not hard-code fake production data into the application.
- Use seed/demo data only where it is explicitly useful for local development.
- Do not claim a feature is complete if it is only a UI mock.
- Every important UI action must connect to a real backend/API flow.
- Validate all inputs on the server, not only in the frontend.
- Enforce authorization on the backend for every protected operation.
- Never trust role information, price, inventory, payment status, order status, or seller identity supplied by the client.
- Never expose secrets, API keys, database credentials, or private server configuration to the client.
- Do not store payment secrets or sensitive credentials in source control.
- Use environment variables and provide a complete .env.example.
- Prefer simple solutions over complex infrastructure.
- Do not introduce microservices, Kubernetes, Kafka, or similar infrastructure unless a real requirement appears later.
- Start with a modular monolith backend and one PostgreSQL database.
- Keep the architecture extensible enough for future scale without prematurely building for massive scale.
- After each major phase, run linting, type checking, tests, and a production build where applicable.
- Fix errors rather than working around them.
- Keep the README and architecture documentation updated as implementation decisions are made.

If a requirement is ambiguous, make the smallest sensible assumption that preserves the product goal and document the assumption. Do not stop the entire build for minor ambiguity.

============================================================
1. PRODUCT OVERVIEW
============================================================

Product name:
PARIDHAN

Tagline:
Wear Local. Support Local.

Core concept:
PARIDHAN is a local clothing marketplace that brings nearby clothing shops online while preserving the human/local shopping experience.

The platform connects:
1. Consumers
2. Local clothing sellers/shops
3. Delivery partners
4. Platform administrators

The main differentiator is the combination of:
- Local clothing shop discovery
- Real local sellers
- Product discovery and shopping
- Bargaining/negotiation
- AI-powered natural-language fashion discovery and assistance
- Optional personalized fashion recommendations
- Online and COD checkout
- Delivery/order tracking
- Seller management
- Admin moderation

The product should feel like a modern fashion marketplace while clearly communicating that the products come from real local shops.

Do not position PARIDHAN as simply "another e-commerce store".
Its product identity is:
LOCAL + HUMAN + AI

============================================================
2. PRIMARY PRODUCT GOALS
============================================================

Goal 1:
Digitize local clothing stores so customers can discover and buy from them.

Goal 2:
Make nearby/local fashion discovery easier than visiting many shops manually.

Goal 3:
Preserve the ability to communicate and bargain with sellers.

Goal 4:
Use AI to make product discovery conversational and personalized.

Goal 5:
Provide sellers with practical tools to manage products, inventory, orders, and bargaining.

Goal 6:
Provide a complete order lifecycle from discovery to delivery.

Goal 7:
Create one shared backend that powers the website and mobile application.

============================================================
3. TARGET PLATFORMS
============================================================

WEB:
- Consumer marketplace
- Seller dashboard
- Admin dashboard
- Responsive design
- Desktop/tablet/mobile browser support

MOBILE:
- Consumer mobile application
- Seller functionality may initially be responsive web or included in the mobile app only if implementation remains clean
- Delivery partner functionality
- Push notifications

Recommended implementation:
- Next.js + TypeScript for web
- React Native + Expo + TypeScript for mobile
- NestJS + TypeScript for backend
- Supabase (PostgreSQL + Auth + Storage) for database, authentication, and media storage

============================================================
4. RECOMMENDED TECH STACK
============================================================

WEB:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui where appropriate
- React Query / TanStack Query for server state
- React Hook Form
- Zod for client-side schema validation
- @supabase/supabase-js (with public anon key)

MOBILE:
- React Native
- Expo
- TypeScript
- Expo Router
- TanStack Query
- React Hook Form
- Zod
- @supabase/supabase-js (with public anon key)

BACKEND:
- NestJS
- TypeScript
- REST API
- @supabase/supabase-js (Supabase Client for PostgreSQL data access)
- Supabase-generated TypeScript database types
- PostgreSQL (via Supabase)

DATABASE & ORM POLICY:
- Supabase PostgreSQL is the single source of truth.
- Use Supabase SQL migrations for schema definitions and changes.
- Use Supabase-generated TypeScript types for end-to-end type safety.
- STRICT RULE: Do NOT introduce TypeORM, Sequelize, Drizzle, or any other third-party ORM.

INFRASTRUCTURE:
- Supabase (PostgreSQL database, Supabase Auth, Supabase Storage)
- Supabase CLI for local database migrations, type generation, and local testing
- Redis for caching/rate limiting/temporary state where needed
- Docker for local development (Supabase local stack / Redis)

AUTHENTICATION:
- Supabase Auth (centralized authentication design for web, mobile, and API)
Required methods:
- Email/password
- Phone OTP
- Google sign-in (OAuth)
- Password reset
- Session / JWT / refresh-token management
- Email/phone verification where applicable
- Server-side JWT validation in NestJS via Supabase Auth guards / strategy

PAYMENTS:
- Razorpay
- Support online payment and COD

MAPS:
- Google Maps Platform
- Shop location
- Nearby shop discovery
- Distance calculation
- Navigation/deep links
- Delivery location support

AI:
- OpenAI API or an equivalent configurable LLM provider
- AI must never be the source of truth for products, prices, inventory, payments, or order status.
- AI should call controlled backend tools/services to retrieve authoritative information.

NOTIFICATIONS:
- Firebase Cloud Messaging for mobile push
- Email provider/SMTP
- WhatsApp Business API where configured

MONITORING:
- Sentry or equivalent
- Server/application logging

ANALYTICS:
- PostHog or equivalent

SOURCE CONTROL:
- GitHub

PACKAGE MANAGEMENT:
- pnpm recommended

MONOREPO:
Recommended:
- Turborepo or a similarly simple pnpm workspace setup

============================================================
5. HIGH-LEVEL ARCHITECTURE
============================================================

                         PARIDHAN
                             |
              +--------------+--------------+
              |                             |
          WEB APP                       MOBILE APP
         Next.js                       React Native
              |                             |
              +--------------+--------------+
                             |
                         REST API
                             |
                         NestJS
                             |
        +--------------------+--------------------+
        |                    |                    |
   AUTH MODULE         MARKETPLACE          ORDER MODULE
                         MODULE
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

Backend is a modular monolith built with NestJS.
Supabase PostgreSQL is the single source of truth for application data.
NestJS communicates with Supabase/PostgreSQL using @supabase/supabase-js with the service-role key for authoritative backend operations.
Supabase-generated database types provide static TypeScript typing across the stack.

Recommended backend modules:
- Auth (Supabase JWT verification & user sync)
- Users
- Roles/Permissions
- Shops
- Products
- Categories
- Inventory
- Search
- Cart
- Wishlist
- Orders
- Payments
- Bargaining
- Delivery
- Reviews
- Notifications
- Locations
- AI
- Admin
- Reports/Complaints
- Audit Logs

============================================================
6. RECOMMENDED REPOSITORY STRUCTURE
============================================================

paridhan/
|
+-- apps/
|   +-- web/
|   +-- mobile/
|   +-- api/
|
+-- packages/
|   +-- types/                 (includes Supabase-generated database types)
|   +-- validation/
|   +-- api-client/
|   +-- config/
|   +-- ui/                    (only if genuinely reusable)
|
+-- supabase/
|   +-- migrations/
|   +-- seed.sql
|   +-- config.toml
|
+-- docs/
|   +-- product-requirements.md
|   +-- architecture.md
|   +-- database.md
|   +-- api.md
|   +-- security.md
|   +-- deployment.md
|   +-- decisions.md
|
+-- .github/
|   +-- workflows/
|
+-- .env.example
+-- README.md
+-- package.json
+-- pnpm-workspace.yaml

Do not create a package merely for the sake of creating one.
Only extract shared packages when there is real reuse.

============================================================
7. USER ROLES
============================================================

ROLE 1: CONSUMER

Can:
- Register/login
- Discover nearby shops
- Search products
- Filter/sort products
- View shops
- View products
- Select variants
- Add to cart
- Wishlist products
- Bargain with eligible sellers
- Checkout
- Pay online
- Select COD where allowed
- View orders
- Track orders
- Cancel eligible orders
- Review/rate products or shops
- Manage profile
- Manage addresses
- Use AI Help Desk
- Receive notifications

ROLE 2: SELLER

Can:
- Register/login
- Create seller profile
- Create/manage shop
- Upload shop information
- Add products
- Manage product variants
- Manage inventory
- Set pricing
- Configure bargaining
- View/manage orders
- Update order preparation status
- View reviews
- Receive notifications
- View basic sales analytics
- Use seller AI assistant where implemented

ROLE 3: DELIVERY_PARTNER

Can:
- Login
- View profile
- View assigned deliveries
- Accept/confirm assignment where required
- View pickup details
- View customer delivery details only when necessary
- Navigate using maps
- Update delivery status
- Confirm pickup
- Confirm delivery
- View delivery history
- View earnings/history if enabled

ROLE 4: ADMIN

Can:
- Manage users
- Manage sellers
- Verify shops
- Moderate products
- Moderate reviews
- Monitor orders
- Manage categories
- Manage brands
- Handle complaints/reports
- Monitor bargaining activity
- Manage platform settings
- View analytics
- Manage/disable accounts where justified
- Audit important system activity

============================================================
8. AUTHORIZATION MODEL & SUPABASE SECURITY
============================================================

Implement RBAC on the backend combined with Supabase Auth and PostgreSQL Row Level Security (RLS).

Roles:
- CONSUMER
- SELLER
- DELIVERY_PARTNER
- ADMIN

AUTHENTICATION & IDENTITY:
- Supabase Auth manages user authentication, credentials, OAuth providers, and JWT issuance.
- The user's role is stored in the application database (`users.role`) and synced or embedded in Supabase JWT user metadata/app metadata.
- All client requests to the NestJS API include the Supabase JWT in the `Authorization: Bearer <token>` header.

BACKEND AUTHORIZATION:
Do not rely only on frontend route protection.
Every protected backend endpoint must verify:
1. Authentication (valid Supabase JWT signature and expiration).
2. Role/permission (user has the required role for the action).
3. Resource ownership where applicable.

Examples:
- Seller A must not edit Seller B's product.
- Seller must only see orders belonging to their shop.
- Delivery partner must only access assigned deliveries.
- Consumer must only access their own cart/orders/addresses.
- Admin can access platform-wide resources.

Consider ownership checks as separate from role checks.

SUPABASE SECURITY & ROW LEVEL SECURITY (RLS):
- Enable RLS on all PostgreSQL tables in Supabase.
- Define explicit RLS policies for read/write access per role where direct client reads or subscriptions occur.
- Authoritative business operations (checkout, bargaining state transitions, payment reconciliation, inventory decrements) must run through the NestJS backend API.
- The NestJS backend uses the Supabase service-role key strictly on the server side to bypass RLS for trusted orchestration and validation.
- STRICT SECURITY RULE: NEVER expose the Supabase service-role key to frontend, mobile, or public clients. Clients only receive the public `anon` key.

============================================================
9. CORE CONSUMER EXPERIENCE
============================================================

HOME:
- Location selector/request
- Nearby shops
- Featured products
- Categories
- Search
- AI assistant entry point
- Personalized recommendations where sufficient data exists

SHOP DISCOVERY:
- Nearby shops
- Distance
- Rating
- Categories
- Open/closed status if implemented
- Delivery availability
- Search/filter

SHOP PAGE:
- Shop name
- Shop images
- Description
- Address
- Distance
- Rating
- Categories
- Products
- Seller/shop information
- Bargaining availability

PRODUCT PAGE:
- Product images
- Product name
- Description
- Price
- Available variants
- Size
- Color
- Inventory availability
- Shop information
- Reviews
- Wishlist
- Add to cart
- Bargain button if enabled
- Related/recommended products

CART:
- Products
- Variants
- Quantity
- Per-item price
- Bargained price where applicable
- Subtotal
- Delivery fee
- Discounts if implemented
- Final total
- Validation of inventory before checkout

CHECKOUT:
- Address
- Delivery option
- Payment method
- Order summary
- Final amount
- Razorpay payment for online payments
- COD if enabled
- Create order only through server-side validation

ORDERS:
- List orders
- Order details
- Status timeline
- Items
- Shop
- Payment status
- Delivery status
- Tracking information
- Cancellation if eligible

============================================================
10. SELLER EXPERIENCE
============================================================

SELLER DASHBOARD:
- Orders summary
- Sales summary
- Inventory alerts
- Product count
- Pending actions

SHOP MANAGEMENT:
- Shop name
- Description
- Address
- Coordinates
- Images
- Contact details
- Operating status
- Delivery availability

PRODUCT MANAGEMENT:
- Create product
- Edit product
- Archive product
- Product images
- Category
- Brand
- Description
- Base price
- Variants
- SKU
- Inventory
- Size
- Color

INVENTORY:
- Variant-level stock
- Low-stock indicator
- Stock updates
- Out-of-stock status
- Prevent overselling

BARGAINING SETTINGS:
Seller can choose whether bargaining is enabled.

Possible settings:
- Enabled/disabled
- Minimum acceptable price
- Maximum negotiation attempts
- Optional automatic counter-offer rules
- Negotiation expiration

Do not expose seller's private minimum acceptable price directly to consumers.

ORDER MANAGEMENT:
Seller can update:
- Confirmed
- Preparing
- Ready for pickup
- Cancelled where permitted

============================================================
11. DELIVERY PARTNER EXPERIENCE
============================================================

Delivery lifecycle:

ASSIGNED
  ->
ACCEPTED
  ->
PICKED_UP
  ->
OUT_FOR_DELIVERY
  ->
DELIVERED

Failure/cancellation states should be defined explicitly.

Delivery partner should see only the information required to perform the delivery.

Location tracking:
- Do not implement continuous background tracking unless necessary.
- For MVP, provide order/delivery location and navigation.
- If live tracking is implemented later, design it with privacy, battery, and authorization considerations.

Delivery confirmation may use:
- OTP
- Customer confirmation
- Proof of delivery where required

============================================================
12. ADMIN EXPERIENCE
============================================================

ADMIN DASHBOARD:
- Users
- Sellers
- Shops
- Products
- Orders
- Deliveries
- Reviews
- Reports
- Complaints
- Bargaining monitoring
- Platform analytics

SHOP VERIFICATION:
Shop can have:
- PENDING
- VERIFIED
- REJECTED
- SUSPENDED

PRODUCT MODERATION:
Possible states:
- ACTIVE
- PENDING_REVIEW
- REJECTED
- ARCHIVED

REVIEWS:
Admin can moderate inappropriate or reported reviews.

REPORTS/COMPLAINTS:
Consumer or seller can report an issue.
Admin can:
- Review
- Change status
- Add resolution
- Record action

============================================================
13. BARGAINING SYSTEM
============================================================

This is a core PARIDHAN differentiator.

Do not implement bargaining as unstructured chat only.

Create a structured BargainingSession and Offer model.

Example:

Product listed price:
₹1,500

Buyer:
₹1,200

Seller:
₹1,400

Buyer:
₹1,300

Seller:
ACCEPT

Final agreed price:
₹1,300

Possible bargaining statuses:
- OPEN
- ACCEPTED
- REJECTED
- EXPIRED
- CANCELLED

Every offer should record:
- Session
- Sender
- Sender role
- Amount
- Timestamp
- Optional message
- Status

Rules:
- Seller must own the shop/product.
- Consumer must be the bargaining participant.
- Offer amount must be validated.
- Accepted price must be locked into the order when checkout occurs.
- A bargain should have an expiration or validity period.
- Inventory must be rechecked before order creation.
- Do not allow client-side manipulation of final price.

Optional later feature:
AI bargaining assistant can suggest a reasonable offer/counter-offer, but it must not automatically commit a financial transaction.

============================================================
14. PRODUCT AND VARIANT DATA MODEL
============================================================

A product may have many variants.

Example:

Product:
Classic Casual Shirt

Variants:
- Black / S
- Black / M
- Black / L
- White / S
- White / M
- White / L

Each variant should have:
- SKU
- Product ID
- Size
- Color
- Price if variant-specific
- Inventory quantity
- Active status

Never store only one size/color directly on the product when variants are required.

Inventory must be variant-specific.

============================================================
15. DATABASE ARCHITECTURE & ENTITIES
============================================================

Supabase PostgreSQL is the single source of truth for all application data.

DATABASE ARCHITECTURE & MIGRATION RULES:
- Database Schema Management: Managed strictly via Supabase SQL migrations stored in `supabase/migrations/<timestamp>_<migration_name>.sql`.
- Type Generation: TypeScript database definitions are generated directly from the Supabase PostgreSQL schema using `supabase gen types typescript --local > packages/types/src/database.types.ts`.
- Data Access: Backend accesses data via `@supabase/supabase-js` using the Supabase client initialized with the service-role key for backend operations.
- STRICT RULE: Do NOT introduce any third-party ORM (e.g. TypeORM, Sequelize, Drizzle).
- Use native PostgreSQL capabilities where advantageous (enums, JSONB for flexible attributes, generated columns, foreign key cascades, PostGIS/haversine for geolocation distance, triggers for `updated_at` timestamps).

At minimum consider these entities:

User
Role / Permission
UserSession
Address
SellerProfile
Shop
ShopImage
Category
Subcategory
Brand
Product
ProductImage
ProductVariant
InventoryMovement
Wishlist
WishlistItem
Cart
CartItem
Order
OrderItem
Payment
Refund
BargainingSession
BargainingOffer
Delivery
DeliveryStatusHistory
Review
Notification
Complaint
Report
AIConversation
AIMessage
SearchHistory
RecommendationEvent
AuditLog
PlatformSetting

Use normalized relational design where appropriate.

Important relationships:

User
 -> addresses
 -> cart
 -> wishlist
 -> orders
 -> reviews
 -> notifications
 -> bargaining sessions

SellerProfile
 -> shop

Shop
 -> products
 -> orders
 -> reviews

Product
 -> variants
 -> images
 -> reviews

ProductVariant
 -> inventory
 -> order items
 -> bargaining sessions where applicable

Order
 -> order items
 -> payment
 -> delivery
 -> status history

============================================================
16. ORDER STATE MACHINE
============================================================

Define a clear state machine.

Suggested order states:

PENDING_PAYMENT
CONFIRMED
PREPARING
READY_FOR_PICKUP
PICKED_UP
OUT_FOR_DELIVERY
DELIVERED
CANCELLED
FAILED

Payment states:
PENDING
AUTHORIZED
PAID
FAILED
REFUND_PENDING
REFUNDED

Do not allow arbitrary state changes.

For example:
CONFIRMED -> PREPARING
PREPARING -> READY_FOR_PICKUP
READY_FOR_PICKUP -> PICKED_UP
PICKED_UP -> OUT_FOR_DELIVERY
OUT_FOR_DELIVERY -> DELIVERED

Define valid cancellation transitions separately.

Every important transition should be logged.

============================================================
17. PAYMENT DESIGN
============================================================

Razorpay is the payment provider.

Important:
- Never trust payment success from the browser alone.
- Verify payment server-side.
- Use Razorpay webhook/event verification where applicable.
- Store provider transaction/reference IDs.
- Maintain internal payment status separately from UI state.
- Make webhook processing idempotent.
- Do not create duplicate orders when a webhook is retried.
- Do not expose Razorpay secret credentials to frontend/mobile.
- Validate order amount server-side.

COD:
- Only available if shop/platform configuration allows it.
- Record payment method as COD.
- Payment status remains unpaid until the appropriate business event.

============================================================
18. SEARCH
============================================================

MVP search should be database-backed and reliable.

Search across:
- Product name
- Description
- Category
- Brand
- Shop name
- Relevant tags

Filters:
- Category
- Subcategory
- Brand
- Price range
- Size
- Color
- Rating
- Distance
- Availability
- Bargaining enabled

Sort:
- Relevance
- Price low-high
- Price high-low
- Rating
- Distance
- Newest

Do not introduce Elasticsearch/OpenSearch unless PostgreSQL search becomes a demonstrated bottleneck.

============================================================
19. LOCATION AND NEARBY SHOPS
============================================================

Shop stores:
- Latitude
- Longitude
- Address

Consumer may provide location.

Nearby shop discovery should calculate distance.

MVP:
- Search within configurable radius.
- Return shops ordered by distance/relevance.
- Do not expose precise user location unnecessarily.

Google Maps:
- Map display
- Directions/navigation
- Geocoding where needed
- Distance calculations where useful

Do not build a custom mapping engine.

============================================================
20. AI SYSTEM
============================================================

AI is a product layer on top of the marketplace.

AI SHOULD HANDLE:
- Natural language product discovery
- Product/shop recommendations
- Fashion assistance
- General order/help questions
- Bargaining suggestions
- Personalized recommendations where enough data exists

AI MUST NOT DIRECTLY AUTHORITATIVELY DECIDE:
- Product price
- Inventory count
- Payment success
- Refund completion
- Order status
- Seller permissions
- User identity
- Shop verification
- Financial transaction authorization

Example:

User:
"I need a casual shirt for a college event under 1500 near me."

AI should translate intent into structured filters:
- category = shirt
- style = casual
- occasion = college/casual
- max_price = 1500
- location = user location

Then call backend search.

Recommended architecture:

User
 -> AI chat endpoint
 -> intent/tool selection
 -> controlled backend service
 -> database/search
 -> result
 -> AI response

Possible backend tools:
- search_products
- search_shops
- get_product
- get_shop
- get_order_status
- get_recommendations
- get_available_variants
- get_bargaining_context

Every tool must validate authorization and inputs.

============================================================
21. AI PERSONALIZATION
============================================================

Recommendation signals can eventually include:
- Browsing history
- Search history
- Wishlist
- Purchases
- Preferred categories
- Price range
- Size preferences
- Color preferences

Do not make the first version unnecessarily complex.

MVP recommendation:
- Rule-based + database signals
- Popular products
- Similar products
- Same category
- Same shop
- Price preference
- User interactions

Then improve with ML/recommendation models after sufficient data exists.

============================================================
22. SKIN-TONE RECOMMENDATIONS
============================================================

The architecture includes optional skin-tone-based recommendations.

Treat this as an optional/advanced feature, not an MVP dependency.

If implemented:
- Do not make sensitive or deterministic claims about a person's identity.
- Avoid storing unnecessary biometric-like information.
- Prefer user-selected preferences or consent-based inputs.
- Recommendations should be presented as style suggestions, not objective judgments.
- The feature must never block shopping or change access to products.

============================================================
23. REVIEWS AND RATINGS
============================================================

Consumer can review eligible purchases.

Prevent:
- Arbitrary reviews for products never purchased, if verified-purchase reviews are required.
- Duplicate reviews where business rules prohibit them.
- Unauthorized editing/deletion.

Review data:
- User
- Product
- Shop
- Order/item reference
- Rating
- Text
- Images if supported
- Status
- Created/updated timestamps

Admin moderation should be possible.

============================================================
24. NOTIFICATIONS
============================================================

Notification types:
- Account events
- Order confirmation
- Payment result
- Seller order notification
- Order status changes
- Delivery assignment
- Out-for-delivery
- Delivered
- Bargaining offer received
- Bargaining accepted/rejected
- Review reminders
- Admin alerts where applicable

Channels:
- In-app
- Push
- Email
- WhatsApp where configured

Notifications should be event-driven internally but do not require a separate event-streaming infrastructure for MVP.

============================================================
25. IMAGE / MEDIA MANAGEMENT (SUPABASE STORAGE)
============================================================

Use Supabase Storage for all file and media assets.

Buckets:
- `product-images`: Public read, authenticated seller write
- `shop-images`: Public read, authenticated seller write
- `avatars`: Public read, authenticated user write
- `review-images`: Public read, authenticated consumer write

Product images:
- Multiple images per product
- Thumbnail / optimized versions
- Secure upload via Supabase Storage API or presigned upload URLs
- File type validation (image/jpeg, image/png, image/webp)
- File size validation (max 5MB per image)

Shop images:
- Logo / profile image
- Cover image
- Gallery images

Do not store large binary files directly in PostgreSQL. Store public/signed Supabase Storage URLs in the database.

============================================================
26. SECURITY REQUIREMENTS
============================================================

Minimum security baseline:

- HTTPS in production
- Supabase Auth for centralized authentication and session management
- Server-side JWT validation in NestJS guards
- Row Level Security (RLS) enabled on all Supabase PostgreSQL tables
- Role-based access control (RBAC) enforced on every backend endpoint
- Resource ownership validation on backend
- Supabase service-role key restricted strictly to backend environment variables; NEVER exposed to clients
- Clients access Supabase exclusively with public `anon` key
- Server-side validation of all business logic, prices, and state transitions
- Rate limiting on auth and sensitive endpoints (using Redis / NestJS Throttler)
- Secure HTTP headers (Helmet)
- CORS configured intentionally
- CSRF protection where applicable to cookie-based authentication
- SQL injection protection through Supabase parameterized queries and prepared statements
- XSS-safe rendering
- Secure file upload validation on Supabase Storage
- Secret management through environment variables
- Audit logs for important admin/payment/order actions
- Do not log passwords, tokens, payment secrets, or sensitive personal data
- Minimize personal data stored
- Proper error responses without leaking stack traces in production

============================================================
27. API DESIGN
============================================================

Use versioned REST APIs.

Example:

/api/v1/auth/*
/api/v1/users/*
/api/v1/shops/*
/api/v1/products/*
/api/v1/categories/*
/api/v1/cart/*
/api/v1/wishlist/*
/api/v1/orders/*
/api/v1/payments/*
/api/v1/bargaining/*
/api/v1/delivery/*
/api/v1/reviews/*
/api/v1/notifications/*
/api/v1/ai/*
/api/v1/admin/*

Example endpoints:

POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout

GET /api/v1/shops
GET /api/v1/shops/:id

GET /api/v1/products
GET /api/v1/products/:id

POST /api/v1/cart/items
PATCH /api/v1/cart/items/:id
DELETE /api/v1/cart/items/:id

POST /api/v1/orders
GET /api/v1/orders
GET /api/v1/orders/:id
POST /api/v1/orders/:id/cancel

POST /api/v1/bargaining
GET /api/v1/bargaining/:id
POST /api/v1/bargaining/:id/offers

POST /api/v1/ai/chat

POST /api/v1/payments/razorpay/create
POST /api/v1/payments/razorpay/webhook

Use DTOs and validation.
Generate API documentation if practical.

============================================================
28. FRONTEND ARCHITECTURE
============================================================

WEB ROUTES SHOULD INCLUDE:

Consumer:
/
/shops
/shops/[id]
/products
/products/[id]
/search
/cart
/checkout
/orders
/orders/[id]
/wishlist
/profile
/ai

Seller:
/seller
/seller/shop
/seller/products
/seller/products/new
/seller/products/[id]
/seller/inventory
/seller/orders
/seller/bargaining
/seller/analytics

Admin:
/admin
/admin/users
/admin/sellers
/admin/shops
/admin/products
/admin/orders
/admin/reviews
/admin/reports
/admin/settings

Protect role-specific routes.

============================================================
29. MOBILE APPLICATION
============================================================

Recommended consumer navigation:

Bottom tabs:
- Home
- Discover/Search
- Wishlist
- Orders
- Profile

Floating/prominent AI entry:
- AI Help Desk

Important mobile screens:
- Splash
- Auth
- Home
- Nearby shops
- Search
- Shop
- Product
- Cart
- Checkout
- Payment
- Orders
- Order details/tracking
- Wishlist
- Profile
- Addresses
- AI assistant

Delivery screens:
- Delivery dashboard
- Assigned delivery
- Pickup
- Navigation
- Delivery confirmation
- History

Use responsive layouts and native mobile interaction patterns.

Do not simply render the website inside a WebView.

============================================================
30. UI/UX DIRECTION
============================================================

PARIDHAN should visually communicate:
- Local
- Fashion
- Trust
- Human interaction
- Modern technology

Avoid generic "AI dashboard" styling for the consumer marketplace.

Consumer UI should be:
- Clean
- Fashion-oriented
- Image-first
- Easy to browse
- Fast
- Mobile-friendly
- Clear about price and availability

Seller UI should prioritize:
- Operational clarity
- Inventory
- Orders
- Bargaining
- Sales

Admin UI should prioritize:
- Data density
- Moderation
- Search/filtering
- Auditability

Maintain a consistent design system.

Do not use excessive animations.
Use motion only when it improves feedback or navigation.

============================================================
31. MVP SCOPE
============================================================

The first production-capable MVP should include:

AUTH:
- Email/password
- Google login
- Phone OTP
- Roles

CONSUMER:
- Home
- Nearby shops
- Search/filter
- Shop page
- Product page
- Variants
- Wishlist
- Cart
- Checkout
- Razorpay
- COD
- Orders
- Basic tracking
- Reviews
- AI product discovery/help

SELLER:
- Shop management
- Product CRUD
- Variant management
- Inventory
- Orders
- Bargaining configuration
- Bargaining

ADMIN:
- User management
- Seller/shop verification
- Product moderation
- Order monitoring
- Reviews
- Reports/complaints
- Basic analytics

DELIVERY:
- Basic assignment
- Pickup
- Out for delivery
- Delivery confirmation

INTEGRATIONS:
- Google OAuth
- Razorpay
- Google Maps
- Image storage
- Push/email notification infrastructure
- AI API

============================================================
32. FEATURES TO DEFER
============================================================

Do not block MVP for:

- Complex machine-learning recommendation systems
- Advanced skin-tone analysis
- Full live driver GPS tracking
- Sophisticated AI bargaining automation
- Multi-vendor settlement engine
- Advanced warehouse management
- Elasticsearch/OpenSearch
- Microservices
- Kubernetes
- Kafka
- Complex distributed event architecture
- International payments
- Multi-country tax engine
- Complex loyalty program
- Advanced seller advertising platform

These can be added after the core product is stable.

============================================================
33. SEARCH / RECOMMENDATION MVP
============================================================

Use PostgreSQL queries and simple ranking initially.

Example recommendation ranking can consider:
- Exact search match
- Category match
- Availability
- Price range
- Shop distance
- Rating
- Popularity
- User preferences

Keep recommendation logic behind a service so it can be replaced later.

============================================================
34. ANALYTICS
============================================================

Track useful product events.

Consumer:
- product_viewed
- shop_viewed
- search_performed
- filter_applied
- wishlist_added
- cart_item_added
- checkout_started
- payment_started
- order_created
- order_completed
- bargaining_started
- bargaining_offer_sent
- ai_query_sent

Seller:
- product_created
- product_updated
- inventory_updated
- order_confirmed
- bargain_received
- bargain_accepted

Do not collect unnecessary personal data.

============================================================
35. AUDIT LOGGING
============================================================

Audit important actions:
- Admin role changes
- Shop verification
- Product moderation
- Order cancellation by privileged actor
- Refund actions
- Payment reconciliation
- Seller suspension
- User suspension
- Important configuration changes

Audit record should include:
- Actor
- Action
- Entity
- Entity ID
- Timestamp
- Relevant metadata
- Request/context ID where useful

============================================================
36. ERROR HANDLING
============================================================

Backend must return consistent errors.

Frontend/mobile should show user-friendly messages.

Never expose:
- Stack traces
- SQL errors
- Internal service secrets
- Raw provider errors where inappropriate

Use request/correlation IDs for debugging.

============================================================
37. DATA VALIDATION
============================================================

Validate:
- Email
- Phone
- Password
- Product prices
- Quantity
- Variant IDs
- Inventory
- Addresses
- Coordinates
- Offer amounts
- Payment amounts
- Order transitions
- File uploads

Never trust:
- price
- discount
- inventory
- role
- user ID
- seller ID
- payment status
- order status

from client requests.

============================================================
38. CONCURRENCY / INVENTORY
============================================================

This is critical.

Two users may try to buy the last item simultaneously.

Use database transactions/atomic operations to prevent overselling.

Checkout must:
1. Re-fetch current product/variant data.
2. Verify active status.
3. Verify stock.
4. Calculate authoritative price.
5. Apply valid bargaining price if applicable.
6. Create/reserve order state.
7. Update inventory safely.
8. Create payment intent/order where applicable.

Do not rely on the cart's old price or inventory.

============================================================
39. IDEMPOTENCY
============================================================

Important operations must tolerate retries.

Especially:
- Payment creation
- Payment webhook processing
- Order creation
- Notification sending
- Delivery status updates

Use idempotency keys or equivalent mechanisms where needed.

============================================================
40. TESTING STRATEGY
============================================================

At minimum test:

AUTH:
- Registration
- Login
- Invalid credentials
- Role authorization
- Password reset

PRODUCTS:
- Product creation
- Variant creation
- Inventory
- Product visibility

CART:
- Add item
- Change quantity
- Remove item
- Out-of-stock handling

ORDERS:
- Checkout
- Invalid inventory
- Price manipulation prevention
- State transitions
- Cancellation

PAYMENTS:
- Successful payment
- Failed payment
- Duplicate webhook
- Amount mismatch

BARGAINING:
- Offer creation
- Unauthorized offer
- Invalid price
- Acceptance
- Expiration

SECURITY:
- Cross-user access attempts
- Seller accessing another seller's product
- Consumer accessing another consumer's order
- Admin-only operations

WEB:
- Main critical flows

MOBILE:
- Main critical flows

Recommended tools:
- Jest
- React Testing Library
- Playwright for important web flows

============================================================
41. LOCAL DEVELOPMENT
============================================================

Provide a clean local development setup.

Prefer Supabase CLI and Docker for:
- Supabase local stack (PostgreSQL, Supabase Auth, Supabase Storage, Supabase Studio)
- Redis

Document:
1. Install dependencies (`pnpm install`)
2. Start Supabase local stack (`supabase start`)
3. Configure .env files from .env.example
4. Run Supabase SQL migrations (`supabase db reset` or `supabase migration up`)
5. Generate TypeScript database types (`supabase gen types typescript --local > packages/types/src/database.types.ts`)
6. Seed demo data (`supabase db reset` which runs seed.sql, or seed script)
7. Start NestJS API (`pnpm --filter api dev`)
8. Start Web application (`pnpm --filter web dev`)
9. Start Mobile application (`pnpm --filter mobile dev`)

Provide commands in README.

Example conceptual commands:

supabase start
pnpm install
supabase db reset
pnpm gen:types
pnpm dev

Exact commands may differ based on final workspace configuration.

============================================================
42. DEMO / SEED DATA
============================================================

Provide realistic development seed data.

Include:
- Multiple consumers
- Multiple sellers
- Multiple shops
- Multiple categories
- Multiple products
- Multiple sizes/colors
- Inventory
- Sample orders
- Sample reviews
- Sample bargaining sessions

Use realistic Indian/local clothing marketplace data.

Do not use real people's personal information.

Example shop categories:
- Men's Wear
- Women's Wear
- Kids Wear
- Ethnic Wear
- Casual Wear
- Accessories

============================================================
43. ENVIRONMENT VARIABLES
============================================================

Create .env.example.

Likely variables:

# Supabase Configuration
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
AUTH_SECRET=

# Google OAuth (configured in Supabase Auth & Web/Mobile)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Payments (Razorpay)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# AI Configuration
AI_API_KEY=

# Maps
GOOGLE_MAPS_API_KEY=

# Email / SMTP
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=

# Monitoring & Analytics
SENTRY_DSN=
ANALYTICS_KEY=

Do not populate secrets in repository.

============================================================
44. DEPLOYMENT
============================================================

Target architecture:

WEB:
- Vercel or equivalent

API:
- Managed Node.js hosting / container deployment

DATABASE, AUTH & STORAGE:
- Managed Supabase Project (PostgreSQL, Supabase Auth, Supabase Storage)

REDIS:
- Managed Redis if required

MOBILE:
- Expo/EAS for development/build/release

CI/CD:
- GitHub Actions

Production must use:
- HTTPS
- Environment-specific secrets
- Database backups
- Monitoring
- Error tracking
- Logging
- Secure CORS
- Rate limiting

============================================================
45. CI/CD
============================================================

On pull request:
- Install
- Lint
- Type check
- Unit tests
- Build

On main branch:
- Run required checks
- Deploy according to environment

Do not automatically deploy broken builds.

============================================================
46. DOCUMENTATION REQUIREMENTS
============================================================

Maintain:

README.md
- Product overview
- Features
- Tech stack
- Local setup
- Environment setup
- Commands
- Deployment overview

docs/architecture.md
- Architecture
- Module boundaries
- Data flow
- External integrations

docs/database.md
- ERD description
- Supabase SQL schema tables/entities
- Relationships & foreign keys
- Supabase SQL migrations & type generation
- Row Level Security (RLS) policies
- Important constraints & indexes

docs/api.md
- API conventions
- Authentication & Supabase JWT verification
- Endpoint documentation

docs/security.md
- Supabase Auth & JWT verification
- RBAC & Row Level Security (RLS)
- Service role key safety
- Input validation
- Secrets
- Payments
- Privacy

docs/deployment.md
- Web
- API
- Supabase (DB, Auth, Storage)
- Mobile
- Environment variables

docs/decisions.md
- Important technical decisions and why they were made

============================================================
47. DEVELOPMENT PHASES
============================================================

PHASE 0 — FOUNDATION

- Inspect repository
- Create monorepo
- Configure TypeScript
- Configure linting/formatting
- Configure environment handling
- Set up Supabase project & local CLI environment
- Set up Supabase SQL migrations & PostgreSQL schema
- Generate Supabase TypeScript database types
- Set up Supabase Storage buckets & policies
- Set up API (NestJS with @supabase/supabase-js)
- Set up web (Next.js with Supabase client)
- Set up mobile (Expo with Supabase client)
- Establish shared types/validation only where useful
- Add CI
- Create documentation structure

PHASE 1 — AUTH + USERS

- Registration
- Login
- Google
- Phone OTP
- Password reset
- Sessions
- Roles
- Profile
- Addresses
- Authorization guards

PHASE 2 — SHOPS + PRODUCTS

- Categories
- Brands
- Shops
- Shop discovery
- Products
- Product images
- Variants
- Inventory
- Search
- Filters

PHASE 3 — SHOPPING

- Wishlist
- Cart
- Checkout
- Pricing
- Inventory validation
- COD

PHASE 4 — PAYMENTS + ORDERS

- Razorpay
- Payment verification
- Webhooks
- Order state machine
- Order history
- Seller order management

PHASE 5 — BARGAINING

- Bargaining sessions
- Offers
- Accept/reject/counter
- Expiration
- Final negotiated price
- Order integration

PHASE 6 — DELIVERY

- Delivery partner
- Assignment
- Pickup
- Out for delivery
- Delivery confirmation
- Basic navigation/maps

PHASE 7 — REVIEWS + NOTIFICATIONS

- Reviews
- Ratings
- In-app notifications
- Push
- Email
- WhatsApp where configured

PHASE 8 — AI

- AI Help Desk
- Natural-language product search
- Product/shop lookup tools
- Order help
- Basic recommendations
- AI bargaining suggestions

PHASE 9 — ADMIN

- User management
- Seller verification
- Product moderation
- Review moderation
- Complaints
- Reports
- Analytics
- Audit logs

PHASE 10 — HARDENING

- Security review
- Authorization review
- Payment review
- Inventory concurrency review
- Tests
- Performance
- Error handling
- Monitoring
- Backup/recovery
- Production deployment

============================================================
48. DEFINITION OF DONE
============================================================

A feature is not done when its screen exists.

A feature is done only when:
- UI exists
- API exists where required
- Database model exists where required
- Validation exists
- Authorization exists
- Loading state exists
- Empty state exists
- Error state exists
- Success state exists
- Mobile behavior exists where applicable
- Tests cover important logic
- Documentation is updated where necessary

============================================================
49. IMPORTANT PRODUCT FLOWS
============================================================

FLOW A — CONSUMER PURCHASE

Login
 ->
Set location
 ->
Discover nearby shop
 ->
Open shop
 ->
Open product
 ->
Select variant
 ->
Add to cart
 ->
Checkout
 ->
Select address
 ->
Select payment
 ->
Payment verification
 ->
Order confirmed
 ->
Seller prepares
 ->
Delivery
 ->
Delivered
 ->
Review

FLOW B — BARGAINING

Open product
 ->
Tap Bargain
 ->
Create session
 ->
Buyer offer
 ->
Seller counter
 ->
Buyer counter
 ->
Seller accepts
 ->
Negotiated price locked
 ->
Checkout
 ->
Server validates current inventory
 ->
Order created

FLOW C — AI DISCOVERY

User:
"Find me a kurta under 2000 near me."

 ->
AI interprets intent
 ->
Backend search tool
 ->
Database returns matching products
 ->
AI ranks/explains options
 ->
User opens product
 ->
Normal marketplace flow

FLOW D — SELLER

Seller login
 ->
Dashboard
 ->
Add product
 ->
Add variants
 ->
Set inventory
 ->
Product becomes available
 ->
Customer buys
 ->
Seller receives order
 ->
Seller confirms/prepares
 ->
Ready for pickup
 ->
Delivery partner picks up

FLOW E — DELIVERY

Delivery partner login
 ->
Assigned order
 ->
View pickup
 ->
Accept
 ->
Pick up
 ->
Navigate
 ->
Out for delivery
 ->
Deliver
 ->
Confirmation
 ->
Completed

============================================================
50. UI SCREENS CHECKLIST
============================================================

CONSUMER WEB:
[ ] Landing/home
[ ] Login
[ ] Register
[ ] OTP
[ ] Home
[ ] Search
[ ] Search results
[ ] Shop list
[ ] Shop page
[ ] Product page
[ ] Cart
[ ] Checkout
[ ] Payment
[ ] Order list
[ ] Order details
[ ] Wishlist
[ ] Profile
[ ] Addresses
[ ] AI Help Desk
[ ] Reviews

SELLER WEB:
[ ] Login
[ ] Dashboard
[ ] Shop management
[ ] Product list
[ ] Add product
[ ] Edit product
[ ] Variant management
[ ] Inventory
[ ] Orders
[ ] Order details
[ ] Bargaining
[ ] Analytics
[ ] Profile

ADMIN WEB:
[ ] Dashboard
[ ] Users
[ ] Sellers
[ ] Shop verification
[ ] Products
[ ] Product moderation
[ ] Orders
[ ] Reviews
[ ] Reports
[ ] Complaints
[ ] Analytics
[ ] Settings
[ ] Audit logs

MOBILE:
[ ] Splash
[ ] Auth
[ ] Home
[ ] Search
[ ] Nearby shops
[ ] Shop
[ ] Product
[ ] Cart
[ ] Checkout
[ ] Payment
[ ] Orders
[ ] Order details
[ ] Wishlist
[ ] Profile
[ ] Addresses
[ ] AI assistant
[ ] Notifications
[ ] Delivery dashboard
[ ] Delivery detail
[ ] Navigation
[ ] Delivery confirmation

============================================================
51. PERFORMANCE TARGETS
============================================================

Prioritize:
- Fast initial page load
- Optimized images (via Supabase Storage CDN transformations)
- Pagination
- Server-side filtering/search where appropriate
- Avoid N+1 database queries
- Efficient Supabase/PostgreSQL queries, proper indexing, and connection management
- Caching for appropriate read-heavy data
- Lazy loading for large lists
- Mobile-friendly payload sizes

Do not optimize prematurely.
Measure first.

============================================================
52. PRIVACY
============================================================

Store only data required for product operation.

Be careful with:
- Phone numbers
- Email addresses
- Home addresses
- Location
- Order history
- AI conversations

Users should not see another user's private information.

Delivery partners should receive only necessary delivery information.

Do not expose seller/customer phone numbers unnecessarily if in-app communication can handle the use case.

============================================================
53. BUSINESS RULES TO ENFORCE
============================================================

Examples:

- Inactive products cannot be purchased.
- Out-of-stock variants cannot be added/ordered.
- Seller can modify only their own shop/products.
- Consumer can modify only their own cart.
- Consumer can see only their own orders.
- Delivery partner can see only assigned deliveries.
- Only eligible orders can be reviewed.
- Only eligible products can be bargained.
- Bargaining must be enabled for the product/shop.
- Accepted bargaining price must be server-authoritative.
- Payment status must be verified server-side.
- Order status transitions must follow the state machine.
- Admin actions must be auditable.

Keep business rules in backend services/domain logic rather than duplicating them in controllers and frontend.

============================================================
54. WHAT NOT TO DO
============================================================

Do not:
- Build only frontend mockups and call it complete.
- Use localStorage as the actual database.
- Trust frontend prices.
- Trust frontend roles.
- Trust frontend payment success.
- Hard-code product inventory.
- Put secrets in frontend code.
- Put secrets in GitHub.
- Create separate implementations of the same backend logic for web and mobile.
- Build microservices just because the architecture diagram has many boxes.
- Add dozens of libraries without need.
- Add unnecessary abstractions.
- Build an AI chatbot disconnected from actual marketplace data.
- Allow AI to invent product availability or prices.
- Build live tracking before the core order system is stable.
- Build advanced ML before collecting meaningful interaction data.
- Make the UI excessively complex.
- Ignore loading/error/empty states.
- Skip authorization because "the frontend hides the button."

============================================================
55. INITIAL IMPLEMENTATION PRIORITY
============================================================

If you need to make a trade-off, prioritize:

1. Correct data model
2. Authentication/security
3. Shop/product/variant/inventory correctness
4. Cart/checkout/order correctness
5. Payment correctness
6. Seller workflow
7. Bargaining
8. Delivery
9. AI
10. Advanced personalization

A broken marketplace with impressive AI is still a broken marketplace.

============================================================
56. AGENT EXECUTION PLAN
============================================================

Before coding:
1. Inspect existing repository.
2. Determine whether code already exists.
3. Do not overwrite useful existing work.
4. Create/update architecture documentation.
5. Create database ERD/schema plan.
6. Create module/API plan.
7. Create implementation checklist.

Then implement phase by phase.

After each phase:
- Run type check.
- Run lint.
- Run tests.
- Run build.
- Fix errors.
- Update documentation.
- Verify the critical user flow manually if possible.

At the end:
- Verify web build.
- Verify mobile build.
- Verify API build.
- Verify Supabase SQL migrations.
- Verify Supabase generated TypeScript types.
- Verify Supabase Auth integration & JWT verification.
- Verify Supabase Storage bucket access.
- Verify seed data.
- Verify authentication.
- Verify authorization.
- Verify payment flow in test mode.
- Verify order lifecycle.
- Verify bargaining.
- Verify critical AI flows.
- Verify deployment configuration.
- Update README.

============================================================
57. FINAL SUCCESS CRITERIA
============================================================

PARIDHAN should ultimately allow a real user to:

1. Sign up/login.
2. Set/share a location.
3. Discover nearby clothing shops.
4. Search for products.
5. Filter products.
6. Open a shop.
7. Open a product.
8. Select size/color.
9. Add to wishlist/cart.
10. Bargain where supported.
11. Checkout.
12. Pay using Razorpay or COD.
13. Receive a confirmed order.
14. Seller receives and manages the order.
15. Delivery partner handles delivery.
16. Customer receives the order.
17. Customer leaves a review.
18. Customer can use AI to discover products and get help.

A seller should be able to:
1. Register.
2. Create/verify a shop.
3. Add products.
4. Add variants.
5. Manage inventory.
6. Receive orders.
7. Manage bargaining.
8. Complete orders.
9. View basic analytics.

An admin should be able to:
1. Manage platform users.
2. Verify sellers/shops.
3. Moderate products/reviews.
4. Monitor orders.
5. Handle reports/complaints.
6. Review important activity.

============================================================
58. FINAL DESIGN PRINCIPLE
============================================================

PARIDHAN is not "an AI app with an e-commerce section."

It is a local fashion marketplace with AI built into the experience.

The hierarchy is:

LOCAL MARKETPLACE
    ->
SHOPS + PRODUCTS
    ->
SHOPPING + ORDERS
    ->
BARGAINING + HUMAN INTERACTION
    ->
AI ASSISTANCE + PERSONALIZATION

The database and backend are the source of truth.
The web and mobile apps are clients.
AI is an intelligent interface over the real system.
Security and correctness take priority over feature count.

Build the smallest complete version first.
Then expand.

END OF MASTER BUILD SPECIFICATION
