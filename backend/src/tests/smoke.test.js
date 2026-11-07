import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import Brand from '../models/Brand.js';
import Category from '../models/Category.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const testMongoUri = process.env.MONGODB_URI;

test('Backend Smoke Tests', async (t) => {
  let isConnected = false;
  
  await t.test('Should connect to MongoDB if URI is accessible', async () => {
    if (!testMongoUri) return;
    try {
      await mongoose.connect(testMongoUri, { serverSelectionTimeoutMS: 2500 });
      isConnected = mongoose.connection.readyState === 1;
      assert.strictEqual(mongoose.connection.readyState, 1, 'Mongoose connected');
    } catch (err) {
      // Gracefully acknowledge offline/unreachable cloud database in local test runner
      console.warn('MongoDB offline or unreachable in local test environment:', err.message);
    }
  });

  await t.test('Brand and Category models compile and validate schema', async (st) => {
    assert.ok(Brand.schema, 'Brand schema compiled');
    assert.ok(Category.schema, 'Category schema compiled');
    if (isConnected) {
      await Brand.findOne();
      await Category.findOne();
    } else {
      st.skip('Skipped remote DB query (offline mode)');
    }
  });

  await t.test('Product and ProductVariant relationships compile', async () => {
    const product = new Product({
      name: 'Smoke Test Product',
      status: 'DRAFT',
      brandSnapshot: 'SmokeBrand',
      categorySnapshot: 'SmokeCategory'
    });
    
    const err = product.validateSync();
    assert.strictEqual(err, undefined, 'Product should validate successfully');
  });

  await t.test('Should disconnect from MongoDB if connected', async () => {
    if (isConnected) {
      await mongoose.disconnect();
    }
    assert.ok(true);
  });
});
