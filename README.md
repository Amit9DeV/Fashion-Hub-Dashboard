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

The application uses a decoupled dual-port architecture:

1. **Frontend (Next.js - Port 3000)**: A 100% pure UI/Client layer built with React, Next.js (App Router), Tailwind CSS, and Shadcn UI. It communicates exclusively with the backend REST API. Mobile-first design for full responsiveness across all viewports.
2. **Backend (Node.js/Express - Port 5000)**: A robust RESTful API handling all business logic, MongoDB connectivity via Mongoose, PDFKit rendering, and secure JSON Web Token (JWT) stateless auth.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB running locally or a MongoDB Atlas URI

### 1. Backend Setup

```bash
cd backend
npm install
```

Ensure your `backend/.env` file contains:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/fashion_hub
AUTH_SECRET=your_super_secret_jwt_key
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

Configure environment variables in `frontend/.env.local`:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:5000/api
AUTH_SECRET=your_super_secret_jwt_key
```

Start the frontend:
```bash
npm run dev
```

### 3. Usage
Navigate to `http://localhost:3000` in your browser. 
Log in using the default admin credentials (e.g., `admin@fashionhub.local` / `password`).

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React 18, TailwindCSS, Lucide Icons, Recharts, Shadcn UI
- **Backend**: Node.js, Express 5, Mongoose 9, PDFKit, Zod, JWT
- **Database**: MongoDB

## 📝 License
Proprietary - All rights reserved.
