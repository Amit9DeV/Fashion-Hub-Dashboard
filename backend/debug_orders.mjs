import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Set MONGODB_URI in the environment before running this maintenance script.");
await mongoose.connect(uri);
const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

// Find which productId is aggregating to 121 units
const allProducts = await Order.aggregate([
  { $unwind: "$items" },
  {
    $group: {
      _id: "$items.productId",
      name: { $first: "$items.productName" },
      sold: { $sum: "$items.quantity" },
      revenue: { $sum: "$items.totalPaisa" },
    }
  },
  { $sort: { sold: -1 } },
  { $limit: 10 },
]);

console.log('All products by units sold:');
allProducts.forEach(p => {
  console.log(`  productId: ${p._id} | name: "${p.name}" | sold: ${p.sold} | revenue: ₹${(p.revenue/100).toFixed(2)}`);
});

// Now check: does "Wrangler short" productId match "Wrangler short" in items?
console.log('\nChecking for products with sold > 5:');
const high = allProducts.filter(p => p.sold > 5);
for (const p of high) {
  const orders = await Order.aggregate([
    { $unwind: "$items" },
    { $match: { "items.productId": p._id } },
    { $project: { completedAt: 1, qty: "$items.quantity", name: "$items.productName", orderNumber: 1 } },
  ]);
  console.log(`\n  "${p.name}" (${p._id}) — ${orders.length} line items:`);
  orders.forEach(o => console.log(`    ${o.completedAt?.toISOString().substring(0,10)} qty:${o.qty} name:"${o.name}" order:${o.orderNumber}`));
}

await mongoose.disconnect();
