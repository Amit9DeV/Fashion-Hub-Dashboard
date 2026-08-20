# Fashion Hub POS

Premium fashion-retail POS foundation built with Next.js App Router, JavaScript, Tailwind, shadcn-style UI components, MongoDB, and Mongoose.

## Start locally

1. Copy `.env.example` to `.env.local` and set `MONGODB_URI` to a MongoDB replica set / Atlas connection. A standalone MongoDB server cannot guarantee the atomic sale transaction this POS requires.
2. Run `npm install`.
3. Run `npm run seed` to create the first admin and a small product catalogue.
4. Run `npm run dev`, then sign in at `http://localhost:3000/login`.

Seed sign-in: `admin@fashionhub.local` / `FashionHub@123` (change it before real use).

## First implemented slice

- Cookie-session authentication and role-aware navigation
- Product variants, customers, orders, invoices, inventory movements, audit logs, and WhatsApp message models
- Billing screen with barcode/SKU/name search, cart, customer lookup/creation, payment choice, and checkout
- Server-side calculation with integer paisa amounts
- Atomic completed-sale transaction: order, payment snapshot, stock decrement, inventory movements, invoice, customer metrics, and audit entry are committed together
- Completed orders are deliberately immutable; future returns/exchanges create new records and movements instead of editing a sale
- Placeholder PDF renderer and resilient WhatsApp delivery queue. WhatsApp/PDF delivery issues are recorded after the sale and never roll it back.

The detailed invoice presentation remains intentionally isolated in `services/invoice/InvoiceTemplate.js` for the supplied invoice design phase.
