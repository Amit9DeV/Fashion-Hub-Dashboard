# Fashion Hub POS

Premium fashion-retail POS foundation built with Next.js App Router, JavaScript, Tailwind, shadcn-style UI components, MongoDB, and Mongoose.

## Start locally

1. Copy `.env.example` to `.env.local`. Set `BACKEND_API_URL` to the Express API, and set `AUTH_SECRET` to the same unique value used by the backend. A MongoDB replica set or Atlas cluster is recommended for atomic multi-document sales; standalone MongoDB uses best-effort writes.
2. Run `npm install`.
3. Run `npm run seed` to create the first admin and master data. Set `SEED_DEMO_CATALOG=true` only if you also want a disposable sample product.
4. Run `npm run dev`, then sign in at `http://localhost:3000/login`.

Local seed sign-in: `admin@fashionhub.local` / `FashionHub@123` (change it before using real store data). Production seed requires explicit `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` values.

## First implemented slice

- HttpOnly cookie sessions, same-origin API proxy, role-aware navigation, and backend role checks
- Product variants, customers, orders, invoices, inventory movements, audit logs, and WhatsApp message models
- Billing screen with barcode/SKU/name search, cart, customer lookup/creation, payment choice, and checkout
- Server-side calculation with integer paisa amounts
- Atomic completed-sale transaction: order, payment snapshot, stock decrement, inventory movements, invoice, customer metrics, and audit entry are committed together
- Completed orders are deliberately immutable; future returns/exchanges create new records and movements instead of editing a sale
- Placeholder PDF renderer and resilient WhatsApp delivery queue. WhatsApp/PDF delivery issues are recorded after the sale and never roll it back.

The detailed invoice presentation remains intentionally isolated in `services/invoice/InvoiceTemplate.js` for the supplied invoice design phase.
