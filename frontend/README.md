# Fashion Hub POS

Premium fashion-retail POS foundation built with Next.js App Router, JavaScript, Tailwind, shadcn-style UI components, MongoDB, and Mongoose.

## Start locally

1. Copy `.env.example` to `.env.local`. Set `BACKEND_API_URL` to the Express API, and set `AUTH_SECRET` to the same unique value used by the backend. MongoDB Atlas or a replica set is required for sales, returns, stock reservations, dues payments, and purchase receipts.
2. Run `npm install`.
3. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (at least 12 characters and no more than 72 UTF-8 bytes) in `backend/.env`, then run `npm run seed` to create the first admin and master data. Set `SEED_DEMO_CATALOG=true` only if you also want a disposable sample product.
4. Run `npm run dev`, then sign in at `http://localhost:3000/login`.

There are no default seed credentials. Production seed additionally requires `CONFIRM_PRODUCTION_SEED=true`.

## First implemented slice

- HttpOnly cookie sessions, same-origin API proxy, role-aware navigation, and backend role checks
- Product variants, customers, orders, invoices, inventory movements, audit logs, and WhatsApp message models
- Billing screen with barcode/SKU/name search, cart, customer lookup/creation, payment choice, and checkout
- Server-side calculation with integer paisa amounts
- Atomic completed-sale transaction: order, payment snapshot, stock decrement, inventory movements, invoice, customer metrics, and audit entry are committed together
- Completed orders are deliberately immutable; future returns/exchanges create new records and movements instead of editing a sale
- PDF invoice generation and a WhatsApp delivery queue. WhatsApp/PDF delivery issues are recorded after the sale and never roll it back.

The app records payment methods and amounts; card and UPI authorization and settlement must be performed by a configured terminal/provider and reconciled separately.
