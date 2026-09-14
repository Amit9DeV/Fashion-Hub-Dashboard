import connectToDatabase from "./src/config/db.js";
import Order from "./src/models/Order.js";
import Invoice from "./src/models/Invoice.js";
import Customer from "./src/models/Customer.js";

async function cleanup() {
  await connectToDatabase();
  console.log("Connected to DB.");

  const legacyOrders = await Order.find({ "staffSnapshot.name": "Legacy Import" });
  console.log(`Found ${legacyOrders.length} legacy orders.`);

  for (const order of legacyOrders) {
    if (order.customerId) {
      await Customer.updateOne(
        { _id: order.customerId },
        {
          $inc: {
            "stats.totalOrders": -1,
            "stats.totalSpentPaisa": -order.totalPaisa,
            "stats.totalDuesPaisa": -order.duePaisa
          }
        }
      );
    }
  }

  await Order.deleteMany({ "staffSnapshot.name": "Legacy Import" });
  await Invoice.deleteMany({ "snapshot.items.sku": "LEGACY-001" });

  console.log("Cleanup complete.");
  process.exit(0);
}

cleanup();
