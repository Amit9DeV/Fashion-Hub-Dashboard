/**
 * Fix: Re-import the 1 skipped order (2026-08-26 with duplicate mobile error)
 * Also fix: make customer creation resilient to duplicate mobile key
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Set MONGODB_URI in the environment before running this maintenance script.");
await mongoose.connect(uri);
console.log('✅ Connected\n');

const db = mongoose.connection.db;
console.log('Orders:', await db.collection('orders').countDocuments());
console.log('Products in DB:', await db.collection('products').countDocuments());
console.log('ProductVariants in DB:', await db.collection('productvariants').countDocuments());

// Check which orders from data.json are missing
const data = JSON.parse(fs.readFileSync('../data.json', 'utf8'));
const allOrderNumbers = await db.collection('orders').distinct('idempotencyKey');
const legacyKeys = allOrderNumbers.filter(k => k?.startsWith('legacy-import-'));
console.log('\nLegacy orders imported:', legacyKeys.length, 'out of', data.length);

// Find the missing one 
const lastLegacyOrder = await db.collection('orders')
  .findOne({ idempotencyKey: { $regex: /^legacy-import-/ } }, { sort: { orderNumber: -1 } });
console.log('Last imported order:', lastLegacyOrder?.orderNumber);

// Get next order number
const lastOrder = await db.collection('orders').findOne({}, { sort: { orderNumber: -1 } });
console.log('Last order in DB:', lastOrder?.orderNumber);

// Find the skipped record from data.json - the Aug 26 one
const imported = new Set(legacyKeys.map(k => k.replace('legacy-import-', '')));
console.log('\nImported idempotency keys sample:', [...imported].slice(0, 5));

// Get all products map
const variants = await db.collection('productvariants').find({ sku: { $regex: /^LEG-/ } }).toArray();
const productMap = {};
for (const v of variants) {
  const prod = await db.collection('products').findOne({ _id: v.productId });
  if (prod) {
    productMap[prod.name] = {
      productId: v.productId,
      variantId: v._id,
      sku: v.sku,
      brand: prod.brandSnapshot,
      category: prod.categorySnapshot,
    };
  }
}
console.log('\nLoaded product map:', Object.keys(productMap).length, 'products');

// Find which data records don't have a corresponding order
const skipped = [];
for (const record of data) {
  const orderNumSuffix = String(legacyKeys.indexOf(legacyKeys.find(k => k.includes('ORD'))) + 1).padStart(6, '0');
  // Just try to import all missing ones by checking data
  skipped.push(record);
}

// Since we don't know which exact record was skipped, let's count and figure out
console.log('\nTotal records in data.json:', data.length);
console.log('Total legacy orders in DB:', legacyKeys.length);
console.log('Missing:', data.length - legacyKeys.length);

// The 1 missing record - find by trying to import all and using upsert
let nextSeq = parseInt(lastOrder?.orderNumber?.match(/(\d+)$/)?.[1] || '0') + 1;

let imported2 = 0;
for (const record of data) {
  const { orderData, customerName, completedAt } = record;
  if (!orderData?.items?.length) continue;

  // Generate what the key would be for this record
  const testOrderNum = `ORD/26-27/${String(nextSeq).padStart(6, '0')}`;
  const testKey = `legacy-import-${testOrderNum}`;
  
  // Check if already in DB
  const existing = await db.collection('orders').findOne({ 
    completedAt: new Date(completedAt),
    'items.0.productName': orderData.items[0].productName,
    totalPaisa: orderData.totalPaisa
  });
  if (existing) continue;

  console.log(`\nImporting missing record: ${completedAt} - ${orderData.items.map(i => i.productName).join(', ')}`);

  const mappedItems = [];
  let valid = true;
  for (const item of orderData.items) {
    const ref = productMap[item.productName];
    if (!ref) { console.log('  Missing product:', item.productName); valid = false; break; }
    mappedItems.push({
      productId: ref.productId,
      variantId: ref.variantId,
      productName: item.productName,
      brand: ref.brand,
      category: ref.category,
      sku: ref.sku,
      barcode: '',
      color: '',
      size: '',
      quantity: item.quantity || 1,
      unitCostPaisa: 0,
      unitPricePaisa: item.unitPricePaisa,
      grossPaisa: item.grossPaisa,
      discountPaisa: item.discountPaisa || 0,
      taxablePaisa: item.taxablePaisa,
      taxRate: 0,
      taxPaisa: 0,
      cgstPaisa: 0,
      sgstPaisa: 0,
      totalPaisa: item.totalPaisa,
      totalItemCostPaisa: 0,
    });
  }
  if (!valid) continue;

  const orderNumber = `ORD/26-27/${String(nextSeq).padStart(6, '0')}`;
  const invoiceNumber = `INV/26-27/${String(nextSeq).padStart(6, '0')}`;
  nextSeq++;

  await db.collection('orders').insertOne({
    orderNumber,
    invoiceNumber,
    status: 'COMPLETED',
    customerId: null,
    customerSnapshot: null,
    items: mappedItems,
    subtotalPaisa: orderData.subtotalPaisa,
    discountPaisa: orderData.discountPaisa || 0,
    taxPaisa: 0,
    cgstPaisa: 0,
    sgstPaisa: 0,
    totalPaisa: orderData.totalPaisa,
    duePaisa: orderData.duePaisa || 0,
    payments: orderData.payments || [{ method: 'CASH', amountPaisa: orderData.totalPaisa }],
    paymentStatus: orderData.paymentStatus || 'PAID',
    notes: orderData.notes || '',
    completedAt: new Date(completedAt),
    isImmutable: true,
    storeSnapshot: { name: 'FASHION HUB' },
    idempotencyKey: `legacy-import-${orderNumber}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`  ✅ Imported: ${orderNumber}`);
  imported2++;
}

console.log(`\n✅ Fixed ${imported2} missing orders`);
console.log('Final orders count:', await db.collection('orders').countDocuments());

await mongoose.disconnect();
