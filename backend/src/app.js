import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import connectToDatabase from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import returnRoutes from './routes/returnRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import staffRoutes from './routes/staffRoutes.js';

const app = express();

app.use(cors({
  origin: '*'
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/staff', staffRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Backend is running' });
});

export default app;
