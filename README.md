# Fashion Hub POS

Fashion Hub POS is a premium, modern point-of-sale system built specifically for retail clothing and fashion stores. It offers a sleek UI/UX, robust inventory management, a highly resilient billing engine, and professional-grade PDF invoice generation.

## 🌟 Key Features

- **Billing Reliability**: Guaranteed exactly-once processing using Idempotency Keys to prevent duplicate charges or double stock deductions on network failures.
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
3. **Database (MongoDB)**: A replica set or Atlas cluster enables atomic sales and inventory transactions. Standalone local MongoDB is supported with best-effort multi-document writes.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB running locally or a MongoDB Atlas URI

### 1. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env` with a MongoDB URI and a unique secret of at least 32 characters:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/fashion_hub
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
From `frontend`, run `npm run seed`. This creates a local admin account and Fashion Hub brand/category master data. Local seed credentials are `admin@fashionhub.local` / `FashionHub@123`; change them before using real store data. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to choose different credentials. For a disposable demo product, also set `SEED_DEMO_CATALOG=true` before seeding.

Then open `http://localhost:3000/login`. Production seeding requires explicit admin credentials and does not create a demo catalogue by default.

## 🛠 Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, Lucide Icons, Recharts, Radix UI
- **Backend**: Node.js, Express 5, Mongoose 9, PDFKit, Zod, JWT
- **Database**: MongoDB

## 📝 License
Proprietary - All rights reserved.
