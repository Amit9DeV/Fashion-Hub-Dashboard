import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app.js';
import connectToDatabase from './config/db.js';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

server.listen(PORT, async () => {
  console.log(`Backend server running on port ${PORT}`);
  try {
    await connectToDatabase();
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed", error);
  }
});
