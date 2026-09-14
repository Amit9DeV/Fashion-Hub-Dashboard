import mongoose from "mongoose";
import fs from "fs";
import connectToDatabase from "./src/config/db.js";
import Order from "./src/models/Order.js";
import Invoice from "./src/models/Invoice.js";
import Customer from "./src/models/Customer.js";
import Product from "./src/models/Product.js";
import ProductVariant from "./src/models/ProductVariant.js";
import Counter from "./src/models/Counter.js";
import { fiscalYearCode } from "./src/services/sales/calculator.js";

const rawDataPath = "../cleaned_sales_data_2026-09-14.json";
const structuredDataPath = "./structured_sales_data.json";

async function nextSaleNumbers(session, now) {
  const financialYear = fiscalYearCode(now);
  const counter = await Counter.findByIdAndUpdate(
    `invoice:${financialYear}`,
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, session, setDefaultsOnInsert: true }
  );
  const sequence = String(counter.sequence).padStart(6, "0");
  return {
    invoiceNumber: `FH/${financialYear}/${sequence}`,
    orderNumber: `ORD/${financialYear}/${sequence}`,
  };
}

async function structureAndUpload() {
  await connectToDatabase();
  console.log("Connected to DB.");

  const rawData = JSON.parse(fs.readFileSync(rawDataPath, "utf-8"));
  
  // Create a legacy product for old data
  let legacyProduct = await Product.findOne({ name: "Legacy Imported Item" });
  if (!legacyProduct) {
    const [p] = await Product.create([{
      name: "Legacy Imported Item",
      description: "Fallback product for old imported sales data",
      categorySnapshot: "MISC",
      brandSnapshot: "MISC",
      status: "ACTIVE"
    }]);
    legacyProduct = p;
  }

  let legacyVariant = await ProductVariant.findOne({ productId: legacyProduct._id });
  if (!legacyVariant) {
    const [v] = await ProductVariant.create([{
      productId: legacyProduct._id,
      sku: "LEGACY-001",
      barcode: "LEGACY-001",
      stock: 9999,
      mrpPaisa: 0,
      sellingPricePaisa: 0,
      status: "ACTIVE"
    }]);
    legacyVariant = v;
  }

  console.log("Transforming data into structured schema format...");
  const structuredData = [];

  // Step 1: Structure the data
  for (const row of rawData) {
    const now = row.date ? new Date(row.date) : new Date();
    if (isNaN(now.getTime())) continue;

    const totalPaisa = (row.total_amount || 0) * 100;
    let paidPaisa = (row.paid_amount || 0) * 100;
    let duePaisa = (row.due_amount || 0) * 100;
    
    // Safety check: calculate correct due
    if (paidPaisa + duePaisa !== totalPaisa) {
        duePaisa = Math.max(0, totalPaisa - paidPaisa);
    }

    let paymentStatus = "PAID";
    if (duePaisa > 0) {
      paymentStatus = paidPaisa > 0 ? "PARTIAL" : "UNPAID";
    }

    const method = (row.payment_mode || "CASH").toUpperCase() === "ONLINE" ? "UPI" : "CASH";
    const payments = paidPaisa > 0 ? [{ method, amountPaisa: paidPaisa }] : [];

    const items = row.items.map((rawItemName, index) => {
      // 1. Clean up product names
      let cleanedName = rawItemName;
      
      // Fix spellings
      cleanedName = cleanedName.replace(/Levising/i, "Levi's");
      cleanedName = cleanedName.replace(/Balman/i, "Balmain");
      cleanedName = cleanedName.replace(/Sap\.\.\./i, ""); // Remove "Sap..."
      cleanedName = cleanedName.replace(/Dollars/i, "Dollar");
      cleanedName = cleanedName.replace(/Killers/i, "Killer");
      cleanedName = cleanedName.replace(/Shiyaram/i, "Siyaram");
      cleanedName = cleanedName.trim();
      
      // Determine Category
      let category = "MISC";
      const nameUpper = cleanedName.toUpperCase();
      if (nameUpper.includes("SHIRT") || nameUpper.includes("T-SHIRT")) category = "TOPWEAR";
      else if (nameUpper.includes("PANT") || nameUpper.includes("JEANS") || nameUpper.includes("SHORT")) category = "BOTTOMWEAR";
      else if (nameUpper.includes("SHOES")) category = "FOOTWEAR";

      // Determine Brand
      let brand = "MISC";
      const knownBrands = ["LEVI'S", "LEVI", "ALLEN SOLLY", "ADIDAS", "WRANGLER", "TOMMY", "H&M", "CANTABELL", "ARMANI", "BALENCIAGA", "SUPERDRY", "PETER ENGLAND", "BURBERRY", "BALMAIN", "LEE COOPER", "SIYARAM", "PUMA", "RARE RABBIT", "KILLER", "PARK AVENUE", "DOLLAR", "NIKE", "DIESEL", "US POLO", "GAS", "HACKETT", "RED TAPE", "WROGN"];
      for (const b of knownBrands) {
        if (nameUpper.includes(b)) {
          brand = b;
          break;
        }
      }

      // 2. Distribute price evenly
      // e.g. 5000 total across 3 items: 1666, 1666, 1668
      const basePrice = Math.floor(totalPaisa / row.items.length);
      const remainder = totalPaisa % row.items.length;
      const unitPrice = basePrice + (index === 0 ? remainder : 0);

      return {
        productId: legacyProduct._id.toString(),
        variantId: legacyVariant._id.toString(),
        productName: cleanedName || "Unknown Item",
        brand,
        category,
        sku: "LEGACY-001",
        quantity: 1, // Assume 1 per line item mentioned
        unitPricePaisa: unitPrice,
        grossPaisa: unitPrice,
        discountPaisa: 0,
        taxablePaisa: unitPrice,
        taxRate: 0,
        taxPaisa: 0,
        totalPaisa: unitPrice
      };
    });

    structuredData.push({
      _source: row, // Keep original reference
      customerName: row.customer || "Walk-in Customer",
      completedAt: now,
      orderData: {
        items,
        subtotalPaisa: totalPaisa,
        discountPaisa: 0,
        taxPaisa: 0,
        totalPaisa,
        duePaisa,
        payments,
        paymentStatus,
        notes: row.notes,
        isImmutable: true
      }
    });
  }

  fs.writeFileSync(structuredDataPath, JSON.stringify(structuredData, null, 2));
  console.log(`Structured data written to ${structuredDataPath} (${structuredData.length} records).`);

  // Step 2: Push to DB
  console.log("Pushing to DB...");
  let successCount = 0;
  for (const entry of structuredData) {
    try {
      let customer = await Customer.findOne({ name: entry.customerName });
      if (!customer) {
        customer = await Customer.create({
          customerCode: `CUS-${Date.now().toString(36).toUpperCase()}`,
          name: entry.customerName,
        });
      }

      const numbers = await nextSaleNumbers(null, new Date(entry.completedAt));
      const customerSnapshot = { name: customer.name };

      const order = await Order.create({
        ...numbers,
        ...entry.orderData,
        customerId: customer._id,
        customerSnapshot,
        staffSnapshot: { id: "legacy", name: "Legacy Import", role: "ADMIN" },
        completedAt: new Date(entry.completedAt),
      });

      const invoiceSnapshot = {
        invoiceNumber: numbers.invoiceNumber,
        orderNumber: numbers.orderNumber,
        issuedAt: new Date(entry.completedAt),
        store: { name: "FASHION HUB" },
        customer: customerSnapshot,
        items: entry.orderData.items,
        subtotalPaisa: entry.orderData.subtotalPaisa,
        discountPaisa: 0,
        taxPaisa: 0,
        totalPaisa: entry.orderData.totalPaisa,
        duePaisa: entry.orderData.duePaisa,
        payments: entry.orderData.payments,
        paymentStatus: entry.orderData.paymentStatus
      };

      await Invoice.create({
        invoiceNumber: numbers.invoiceNumber,
        orderId: order._id,
        customerId: customer._id,
        publicToken: `leg-${Date.now().toString(36)}`,
        snapshot: invoiceSnapshot,
      });

      await Customer.updateOne(
        { _id: customer._id },
        {
          $inc: {
            "stats.totalOrders": 1,
            "stats.totalSpentPaisa": entry.orderData.totalPaisa,
            "stats.totalDuesPaisa": entry.orderData.duePaisa
          },
          $set: {
            "stats.lastPurchaseAt": new Date(entry.completedAt)
          }
        }
      );
      
      successCount++;
    } catch (err) {
      console.error("Failed to import entry:", entry.customerName, err.message);
    }
  }

  console.log(`Successfully uploaded ${successCount} out of ${structuredData.length} records.`);
  process.exit(0);
}

structureAndUpload();
