import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function clearDb() {
  try {
    const MONGO_URI = process.env.MONGODB_URI;
    if (!MONGO_URI) throw new Error('MONGODB_URI is not defined');
    if (process.env.NODE_ENV === 'production') throw new Error('Refusing to drop a production database.');
    const targetDatabase = new URL(MONGO_URI).pathname.replace(/^\//, '').split('/')[0];
    if (!targetDatabase || process.env.CONFIRM_DROP_DATABASE !== targetDatabase) {
      throw new Error('Set CONFIRM_DROP_DATABASE to the exact database name to confirm this destructive action.');
    }
    
    console.log('Connecting to database to wipe...');
    await mongoose.connect(MONGO_URI);
    
    console.log('Dropping database...');
    await mongoose.connection.db.dropDatabase();
    
    console.log('Database cleared successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to clear database:', err);
    process.exit(1);
  }
}

clearDb();
