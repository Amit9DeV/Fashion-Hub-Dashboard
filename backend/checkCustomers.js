import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Customer from './src/models/Customer.js';

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const customers = await Customer.find({});
  console.log(JSON.stringify(customers, null, 2));
  process.exit(0);
});
