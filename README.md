# Fashion Hub POS

Fashion Hub POS is a premium, modern point-of-sale system built specifically for retail clothing and fashion stores. It offers a sleek UI/UX, robust inventory management, a highly resilient billing engine, and professional-grade PDF invoice generation.

## 🌟 Key Features

- **Billing Reliability**: Idempotency keys and MongoDB transactions protect completed sales from duplicate processing and partial writes.
- **Dynamic Order Editing**: Orders are initially immutable to protect ledger integrity, but authorized users can securely "Edit" an order, automatically triggering a stock, customer stats, and revenue reconciliation process.
- **Variant-Level Inventory**: Manage products with multiple variants (sizes, colors, SKUs, barcodes) with individual stock tracking and low-stock alerts.
- **Premium PDF Invoices**: Generates A4 PDF invoices natively on the backend, complete with selectable text, embedded fonts, custom trust badges, and dynamically configurable settings (CGST/SGST/Total tax views).
- **Role-Based Access**: Secure dashboard and management tools for Admins and Managers.
- **Responsive Dashboard**: Beautiful charts (Recharts) detailing revenue trends, top-selling items, and category-level performance tracking.
- **WhatsApp Integration**: Out-of-the-box infrastructure to deliver bills directly to customers' WhatsApp numbers.

## 🏗 Architecture

The application uses a Next.js frontend, an Express API, and MongoDB:

1. **Frontend (Next.js - Port 3000)**: React App Router UI. Browser API traffic goes through a same-origin Next.js route handler, which attaches the HttpOnly session token before forwarding to Express. This avoids third-party cookie dependencies.
2. **Backend (Node.js/Express - Port 5000)**: REST API for business logic, authorization, MongoDB access, PDF invoices, and WhatsApp delivery.
3. **Database (MongoDB)**: MongoDB Atlas or another replica-set/sharded deployment is required for sales, returns, stock reservations, and purchase receiving. The app rejects these operations on standalone MongoDB rather than risk partial writes.

## 🚀 Getting Started

### Prerequisites
- Node.js 20.9 or higher (required by the bundled Next.js version)
- MongoDB Atlas or a local MongoDB replica set (required for atomic checkout, returns, and payment posting)

### 1. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env` with a MongoDB URI and a unique secret of at least 32 characters:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/fashion_hub?replicaSet=rs0
AUTH_SECRET=
PORT=5000
FRONTEND_URL=http://localhost:3000
```

Start the backend:
```bash
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Configure `frontend/.env.local` with the same auth secret:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
BACKEND_API_URL=http://localhost:5000/api
AUTH_SECRET=the-same-secret-as-backend
```

Start the frontend:
```bash
npm run dev
```

### 3. Seed and sign in
Before seeding, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (at least 12 characters and no more than 72 UTF-8 bytes) in `backend/.env`. From `frontend`, run `npm run seed` to create the initial admin and Fashion Hub brand/category master data. There are no built-in admin credentials. For a disposable demo product, set `SEED_DEMO_CATALOG=true` before seeding.

Then open `http://localhost:3000/login`. Seeding requires explicit `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` values; there are no default admin credentials. Production seeding additionally requires `CONFIRM_PRODUCTION_SEED=true`. Do not use a demo catalogue for live stock.

## Production deployment checklist

- Rotate any database credential that has ever appeared in source control. Configure `MONGODB_URI` and `AUTH_SECRET` only through your deployment's secret manager; never commit them.
- Use a MongoDB replica set or Atlas cluster, enable automated backups and point-in-time recovery, and rehearse restoring a backup before opening the store.
- Configure the frontend and backend origins explicitly, use HTTPS, and set `NODE_ENV=production`.
- Set `CASHIER_MAX_DISCOUNT_PERCENT` to the store's approved cashier discount limit. It defaults to 0%; managers and admins can approve larger discounts.
- Configure a real WhatsApp Business integration and confirm template approval before enabling outbound invoice messages.
- The app records payment methods and amounts. It does not authorize or settle card/UPI payments; use a payment terminal/provider and reconcile its settlements separately.
- Verify store identity, tax settings, invoice fields, exchange/return policy, and any applicable tax/accounting obligations with the store's accountant before issuing live invoices.
- Perform a staffed end-to-end checkout, refund, exchange, shift close, and restore drill against a separate production-like database before launch.

## 🛠 Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, Lucide Icons, Recharts, Radix UI
- **Backend**: Node.js, Express 5, Mongoose 9, PDFKit, Zod, JWT
- **Database**: MongoDB

## 📝 License
Proprietary - All rights reserved.
