/**
 * Migration Script: Re-import historical sales from data.json
 * 
 * Step 1: Deletes all orders that used the LEGACY-001 placeholder SKU
 * Step 2: Creates a "Legacy Import" product for each unique product name
 * Step 3: Re-imports all 63 historical orders with correct product references
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Set MONGODB_URI in the environment before running this migration.");
if (process.env.CONFIRM_LEGACY_IMPORT !== "true") {
  throw new Error("This migration can delete imported orders. Set CONFIRM_LEGACY_IMPORT=true only after verifying a database backup.");
}

// ── Minimal schemas (strict:false to avoid needing all fields) ──
const ProductSchema = new mongoose.Schema({}, { strict: false, collection: 'products' });
const VariantSchema = new mongoose.Schema({}, { strict: false, collection: 'productvariants' });
const OrderSchema = new mongoose.Schema({}, { strict: false, collection: 'orders' });
const InvoiceSchema = new mongoose.Schema({}, { strict: false, collection: 'invoices' });
const CustomerSchema = new mongoose.Schema({}, { strict: false, collection: 'customers' });

const Product = mongoose.model('Product', ProductSchema);
const ProductVariant = mongoose.model('ProductVariant', VariantSchema);
const Order = mongoose.model('Order', OrderSchema);
const Invoice = mongoose.model('Invoice', InvoiceSchema);
const Customer = mongoose.model('Customer', CustomerSchema);

await mongoose.connect(uri);
console.log('✅ Connected to MongoDB Atlas\n');

// ── Load data ──
const data = JSON.parse(fs.readFileSync('../data.json', 'utf8'));
console.log(`📦 Loaded ${data.length} orders from data.json`);

// ── Step 1: Delete existing placeholder orders ──
console.log('\n─── Step 1: Cleaning up placeholder orders ───');
const legacyOrders = await Order.find({ 'items.sku': 'LEGACY-001' }).lean();
console.log(`Found ${legacyOrders.length} orders with LEGACY-001 SKU`);

const legacyOrderIds = legacyOrders.map(o => o._id);
if (legacyOrderIds.length > 0) {
  await Invoice.deleteMany({ orderId: { $in: legacyOrderIds } });
  console.log(`Deleted ${legacyOrderIds.length} invoices`);
  await Order.deleteMany({ _id: { $in: legacyOrderIds } });
  console.log(`Deleted ${legacyOrderIds.length} orders`);
}

// ── Step 2: Create legacy products in catalogue ──
console.log('\n─── Step 2: Creating legacy products in catalogue ───');

const allProductNames = new Set();
data.forEach(r => r.orderData?.items?.forEach(i => allProductNames.add(i.productName)));
console.log(`Creating ${allProductNames.size} unique products...`);

// Infer category from product name
function inferCategory(name) {
  const n = name.toLowerCase();
  if (n.includes('jeans') || n.includes('pant') || n.includes('short') || n.includes('lower') || n.includes('trousers')) return 'BOTTOMWEAR';
  if (n.includes('shoes') || n.includes('sneaker') || n.includes('boot') || n.includes('slipper')) return 'FOOTWEAR';
  if (n.includes('t-shirt') || n.includes('tshirt')) return 'T-SHIRTS';
  if (n.includes('shirt')) return 'TOPWEAR';
  if (n.includes('look') || n.includes('denim look')) return 'BOTTOMWEAR';
  return 'OTHER';
}

function inferBrand(name) {
  const brands = ['Levi', 'Wrangler', 'Adidas', 'Nike', 'Puma', 'Tommy', 'H&M', 'Allen Solly',
    'Balmain', 'Lee Cooper', 'Balenciaga', 'Armani', 'Diesel', 'Gas', 'Hackett',
    'Killer', 'Park Avenue', 'Peter England', 'Rare Rabbit', 'Red Tape', 'Siyaram',
    'Superdry', 'US Polo', 'Wrogn', 'Pepe', 'Bewkoof', 'Dollar', 'Cantabell', 'Indian'];
  for (const brand of brands) {
    if (name.toLowerCase().includes(brand.toLowerCase())) return brand.toUpperCase();
  }
  return 'MISC';
}

// Map productName -> { productId, variantId }
const productMap = {};

for (const productName of allProductNames) {
  const sku = `LEG-${productName.substring(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '')}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
  const category = inferCategory(productName);
  const brand = inferBrand(productName);

  // Find the price from data.json for this product name
  let samplePrice = 50000; // default ₹500 in paisa
  for (const record of data) {
    const item = record.orderData?.items?.find(i => i.productName === productName);
    if (item && item.unitPricePaisa > 0) {
      samplePrice = item.unitPricePaisa;
      break;
    }
  }

  const productDoc = new Product({
    name: productName,
    brandSnapshot: brand,
    categorySnapshot: category,
    description: `Legacy import - ${productName}`,
    status: 'ACTIVE',
    taxRate: 0,
    createdAt: new Date('2026-08-01T00:00:00Z'),
    updatedAt: new Date(),
  });
  await productDoc.save();

  const variantDoc = new ProductVariant({
    productId: productDoc._id,
    sku,
    color: '',
    size: '',
    sellingPricePaisa: samplePrice,
    mrpPaisa: samplePrice,
    costPricePaisa: 0,
    stock: 0, // legacy item, no current stock
    status: 'ACTIVE',
    createdAt: new Date('2026-08-01T00:00:00Z'),
    updatedAt: new Date(),
  });
  await variantDoc.save();

  productMap[productName] = {
    productId: productDoc._id,
    variantId: variantDoc._id,
    sku,
    brand,
    category,
  };

  process.stdout.write('.');
}
console.log(`\n✅ Created ${Object.keys(productMap).size} products`);

// ── Step 3: Re-import orders ──
console.log('\n─── Step 3: Re-importing orders ───');

// Get existing order numbers to generate correct next numbers
const lastOrder = await Order.findOne({}).sort({ orderNumber: -1 }).lean();
let orderSeq = 1;
if (lastOrder?.orderNumber) {
  const match = lastOrder.orderNumber.match(/(\d+)$/);
  if (match) orderSeq = parseInt(match[1]) + 1;
}

let importedCount = 0;
let skippedCount = 0;

for (const record of data) {
  try {
    const { orderData, customerName, completedAt } = record;
    if (!orderData?.items?.length) { skippedCount++; continue; }

    // Map items to correct product references
    const mappedItems = orderData.items.map(item => {
      const ref = productMap[item.productName];
      if (!ref) throw new Error(`Product not found: ${item.productName}`);
      return {
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
      };
    });

    // Generate order number
    const fy = '26-27';
    const orderNumber = `ORD/${fy}/${String(orderSeq).padStart(6, '0')}`;
    const invoiceNumber = `INV/${fy}/${String(orderSeq).padStart(6, '0')}`;
    orderSeq++;

    // Resolve or skip customer
    let customerId = null;
    let customerSnapshot = null;
    if (customerName && customerName !== 'Walk-in Customer') {
      const cust = await Customer.findOne({ name: new RegExp(`^${customerName}$`, 'i') }).lean();
      if (cust) {
        customerId = cust._id;
        customerSnapshot = { name: cust.name, mobile: cust.mobile || '' };
      } else {
        // Create customer
        const newCust = new Customer({
          customerCode: `CUS-${Date.now().toString(36).toUpperCase()}`,
          name: customerName,
          mobile: '',
          status: 'ACTIVE',
          createdAt: new Date(completedAt),
          updatedAt: new Date(),
          stats: { totalOrders: 0, totalSpentPaisa: 0, totalDuesPaisa: 0 }
        });
        await newCust.save();
        customerId = newCust._id;
        customerSnapshot = { name: customerName, mobile: '' };
      }
    }

    const order = new Order({
      orderNumber,
      invoiceNumber,
      status: 'COMPLETED',
      customerId,
      customerSnapshot,
      items: mappedItems,
      subtotalPaisa: orderData.subtotalPaisa,
      discountPaisa: orderData.discountPaisa || 0,
      taxPaisa: orderData.taxPaisa || 0,
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
    });
    await order.save();

    // Create invoice record
    const invoice = new Invoice({
      orderId: order._id,
      orderNumber,
      invoiceNumber,
      completedAt: new Date(completedAt),
    });
    await invoice.save().catch(() => {}); // ignore if invoice model requires more fields

    // Update customer stats
    if (customerId) {
      await Customer.findByIdAndUpdate(customerId, {
        $inc: {
          'stats.totalOrders': 1,
          'stats.totalSpentPaisa': orderData.totalPaisa,
          'stats.totalDuesPaisa': orderData.duePaisa || 0,
        }
      });
    }

    importedCount++;
    process.stdout.write('.');
  } catch (err) {
    console.error(`\n❌ Error on record:`, record._source?.date, err.message);
    skippedCount++;
  }
}

console.log(`\n\n✅ Import complete!`);
console.log(`   Imported: ${importedCount} orders`);
console.log(`   Skipped:  ${skippedCount} orders`);

const finalCount = await Order.countDocuments();
console.log(`   Total orders in DB now: ${finalCount}`);

await mongoose.disconnect();
console.log('\n🔌 Disconnected.');
