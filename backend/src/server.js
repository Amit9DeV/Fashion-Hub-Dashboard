import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app.js';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});
