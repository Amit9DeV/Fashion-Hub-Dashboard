import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Order from './src/models/Order.js';

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const orders = await Order.find({}).sort({createdAt: -1}).limit(5);
  console.log(JSON.stringify(orders.map(o => ({id: o._id, customerId: o.customerId, snapshot: o.customerSnapshot, completedAt: o.completedAt})), null, 2));
  process.exit(0);
});
