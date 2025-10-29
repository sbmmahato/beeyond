## Inventory-Aware Checkout (PERN)

Production-grade cart → reservation → confirm checkout with concurrency safety, low-stock alerts, and Next.js UI.

### Tech Stack
- **Frontend**: Next.js, Tailwind CSS
- **Backend**: Express (TypeScript)
- **DB**: Postgres via Prisma (Supabase compatible)
- **Auth**: Mock header `x-user-id` (`demo-user`)
- **Deployment**: Vercel (separate projects for API and Web)

---

### Features Implemented
- **Catalog**: API to list products with pagination; frontend grid with add-to-cart.
- **Cart**: Per-user persisted cart; upsert, update qty, delete; totals; validations (qty 1–5).
- **Checkout**:
  - Reserve: Validates stock, creates 10-minute reservation with item and price snapshot.
  - Confirm: Concurrency-safe stock decrement (row locks), idempotent confirm, cart clear.
  - UI: Address + shipping form, summary, live TTL countdown.
- **Low-Stock Alerts**: Created when post-order stock < threshold; admin list + ack endpoint.
- **API Tests**: 6+ tests including concurrency, idempotency, reserve validation, and alerts.

---

### Local Setup
Prerequisites:
- Node 18+
- Postgres (local or Supabase)

1) Configure environment variables
- Create `api/.env`:
```
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
DIRECT_DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
PORT=4000
```
- Create `web/.env`:
```
NEXT_PUBLIC_API_BASE="http://localhost:4000"
```

2) Install, migrate, seed
```
cd api
npm i
npx prisma migrate dev --name init
npm run seed

cd ../web
npm i
```

3) Run locally
```
# Terminal 1
cd api
npm run dev

# Terminal 2
cd web
npm run dev
```
- Open `http://localhost:3000`
- API at `http://localhost:4000`

4) Run tests (API)
```
cd api
npm run test
```

---

### Deployment (Vercel)
Recommend two projects: one for `api/`, one for `web/`.

API project (Root Directory: `api`)
- Build Command:
```
npx prisma generate && npx prisma migrate deploy && npm run build
```
- Environment Variables:
  - `DATABASE_URL` = pooled URL (optional at runtime)
  - `DIRECT_DATABASE_URL` = direct URL (port 5432, required for migrate)
  - `PORT` = 4000 (optional)
- Node version: 18+

Web project (Root Directory: `web`)
- Next.js preset
- Environment Variables:
  - `NEXT_PUBLIC_API_BASE` = `https://<api-project>.vercel.app`

Notes:
- If migrations fail with P1001, ensure `DIRECT_DATABASE_URL` points to the direct 5432 connection and Supabase isn’t paused.
- You can seed once against production from your machine using `npm run seed` with `DIRECT_DATABASE_URL` (do not seed on every deploy).

---

### Design Decisions & Trade-offs
- **Soft reservation**: Reservation does not decrement stock; stock is validated again at confirm with row-level locks. Simpler UX (no held stock leakage) with robust oversell prevention at confirm.
- **Concurrency control**: Uses `SELECT ... FOR UPDATE` over product rows inside a single transaction before decrementing. Prevents oversells under concurrent confirms.
- **Idempotency**: Confirm checks reservation status; if already consumed, returns the same order id.
- **Mock auth**: Header-based `x-user-id` keeps focus on inventory logic and flow.
- **Price snapshot**: Prices stored in reservation and order items to prevent price drift during the flow.

---

### Schema, Indexing, Transactions, Performance
- Prisma models: `Product`, `Cart`, `CartItem`, `Reservation`, `ReservationItem`, `Order`, `OrderItem`, `LowStockAlert`.
- Indexes:
  - `Cart.userId` unique + index
  - `Reservation.userId` index
  - `Order.userId` index
  - `Product.sku` unique
- Transactions:
  - Confirm endpoint wraps: row locks (products) → stock validate → decrement → order create → reservation consumed → cart clear → low-stock alerts.
- Performance:
  - Catalog: select-specific fields; pagination.
  - Low-stock alerts via `createMany`.
  - Postgres row-level locking only on changed products, minimizing contention footprint.

---

### API Overview
- Cart:
  - `GET /api/cart`
  - `POST /api/cart` { productId, qty }
  - `PATCH /api/cart/:productId` { qty }
  - `DELETE /api/cart/:productId`
- Products:
  - `GET /api/products?limit=20&offset=0`
- Checkout:
  - `POST /api/checkout/reserve` { address, shippingMethod }
  - `POST /api/checkout/confirm` { reservationId }
- Admin:
  - `GET /api/admin/low-stock-alerts?processed=false`
  - `POST /api/admin/low-stock-alerts/:id/ack`

Headers:
- `x-user-id: demo-user`

Errors:
- `{ error: "message" }` with 400/409/410/500; 409 for insufficient stock, 410 for expired reservation.

---

### Future Improvements
- Hold inventory (hard reservation) with TTL decrement + periodic sweeper to restore stock on expiry.
- WebSockets or Server-Sent Events to push live stock changes to cart page.
- Rate limits and abuse protection on cart updates.
- Admin dashboard UI for low-stock alerts and product management.
- Observability: structured logs, tracing (OpenTelemetry), metrics.
- Optimistic UI updates with React Query and cache invalidation.


