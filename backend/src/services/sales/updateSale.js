import mongoose from "mongoose";
import connectToDatabase from "../../config/db.js";
import Product from "../../models/Product.js";
import ProductVariant from "../../models/ProductVariant.js";
import Customer from "../../models/Customer.js";
import Order from "../../models/Order.js";
import Invoice from "../../models/Invoice.js";
import InventoryMovement from "../../models/InventoryMovement.js";
import AuditLog from "../../models/AuditLog.js";
import Settings from "../../models/Settings.js";
import { calculateSale, compactCart } from "../../services/sales/calculator.js";
import { saleInputSchema } from "./completeSale.js";
import { generateInvoicePdf } from "../invoice/InvoicePDFService.js";

function cleanPhone(value) {
  return value?.replace(/[^\d+]/g, "") || undefined;
}

async function resolveCustomerForUpdate(input, user, session, now) {
  if (!input) return null;
  
  if (input.customerId) {
    const cust = await Customer.findById(input.customerId).session(session);
    if (!cust) throw new Error("The selected customer no longer exists.");
    return cust;
  }
  
  const mobile = cleanPhone(input.mobile);
  const whatsappNumber = cleanPhone(input.whatsappNumber) || mobile;
  if (!mobile && !whatsappNumber) return null;
  
  let cust = mobile ? await Customer.findOne({ mobile }).session(session) : null;
  if (cust) {
    const updates = {
      ...(input.name ? { name: input.name } : {}),
      ...(whatsappNumber ? { whatsappNumber } : {}),
    };
    if (typeof input.billingWhatsAppConsent === "boolean") {
      updates["consents.billingWhatsApp"] = input.billingWhatsAppConsent;
    }
    if (typeof input.marketingWhatsAppConsent === "boolean") {
      updates["consents.marketingWhatsApp"] = input.marketingWhatsAppConsent;
      if (!input.marketingWhatsAppConsent) updates["consents.marketingOptedOutAt"] = now;
    }
    await Customer.updateOne({ _id: cust._id }, { $set: updates }, { session });
    return Customer.findById(cust._id).session(session);
  }
  
  const [created] = await Customer.create([{
    customerCode: `CUS-${now.getTime().toString(36).toUpperCase()}`,
    name: input.name || "Walk-in customer",
    mobile,
    whatsappNumber,
    consents: {
      billingWhatsApp: Boolean(input.billingWhatsAppConsent),
      marketingWhatsApp: Boolean(input.marketingWhatsAppConsent),
      ...(input.marketingWhatsAppConsent ? {} : { marketingOptedOutAt: now }),
    },
    createdBy: user.id,
  }], { session });
  return created;
}

export async function updateSale(orderId, rawInput, user) {
  const input = saleInputSchema.parse(rawInput);
  await connectToDatabase();

  let session = await mongoose.startSession();
  let result;

  try {
    const isStandalone = !process.env.MONGODB_URI.includes("replicaSet");
    if (isStandalone) {
      session.endSession();
      session = undefined;
    }
    const runBlock = isStandalone ? (cb) => cb() : (cb, opts) => session.withTransaction(cb, opts);

    await runBlock(async () => {
      const settings = await Settings.findOne().session(session);
      const globalTaxRate = settings?.taxRate ?? 0;
      
      const order = await Order.findById(orderId).session(session);
      if (!order) throw new Error("Order not found.");
      
      const invoice = await Invoice.findOne({ orderId: order._id }).session(session);
      if (!invoice) throw new Error("Invoice not found.");

      const now = input.completedAt ? new Date(input.completedAt) : order.completedAt;

      // --- 1. REVERSE OLD STOCK & STATS ---
      for (const item of order.items) {
        await ProductVariant.updateOne(
          { _id: item.variantId },
          { $inc: { stock: item.quantity } },
          { session }
        );
      }
      
      if (order.customerId) {
        await Customer.updateOne(
          { _id: order.customerId },
          { 
            $inc: { 
              "stats.totalOrders": -1,
              "stats.totalSpentPaisa": -order.totalPaisa 
            } 
          },
          { session }
        );
      }

      // --- 2. CALCULATE NEW ITEMS ---
      const compactedItems = compactCart(input.items);
      const saleLines = [];

      for (const requestedItem of compactedItems) {
        const product = await Product.findOne({
          _id: requestedItem.productId,
          status: "ACTIVE"
        }).session(session);
        if (!product) throw new Error("One of the selected products is unavailable.");

        const variant = await ProductVariant.findOne({
          _id: requestedItem.variantId,
          productId: product._id,
          status: "ACTIVE"
        }).session(session);
        if (!variant) throw new Error("One selected variant is inactive or missing.");
        
        if (variant.stock < requestedItem.quantity) {
          throw new Error(`${product.name} (${variant.color || ""} ${variant.size || ""}) has only ${variant.stock} item(s) available.`);
        }

        saleLines.push({
          productId: product._id,
          variantId: variant._id,
          productName: requestedItem.overriddenName || product.name,
          brand: product.brandSnapshot,
          category: product.categorySnapshot,
          sku: variant.sku,
          barcode: variant.barcode,
          color: variant.color,
          size: variant.size,
          quantity: requestedItem.quantity,
          unitPricePaisa: requestedItem.overriddenPricePaisa || variant.sellingPricePaisa,
          taxRate: globalTaxRate,
        });
      }

      const totals = calculateSale(saleLines, input.discountPaisa);
      const amountPaidPaisa = input.payments.reduce((sum, payment) => sum + payment.amountPaisa, 0);
      if (amountPaidPaisa !== totals.totalPaisa) {
        throw new Error("Payment total must exactly match the final bill total.");
      }

      // --- 3. DEDUCT NEW STOCK ---
      for (const item of totals.items) {
        const updateResult = await ProductVariant.updateOne(
          {
            _id: item.variantId,
            productId: item.productId,
            stock: { $gte: item.quantity },
            status: "ACTIVE"
          },
          { $inc: { stock: -item.quantity } },
          { session }
        );
        if (updateResult.modifiedCount !== 1) {
          throw new Error(`Stock changed while saving edits for ${item.sku}. Please retry.`);
        }
      }

      // --- 4. RESOLVE NEW CUSTOMER STATS ---
      const customer = await resolveCustomerForUpdate(input.customer, user, session, now);
      
      if (customer) {
        // Read the updated stats (after reversal) to compute the new average
        const freshCust = await Customer.findById(customer._id).session(session);
        const oldOrders = freshCust.stats?.totalOrders || 0;
        const oldSpent = freshCust.stats?.totalSpentPaisa || 0;
        const totalOrders = oldOrders + 1;
        const totalSpentPaisa = oldSpent + totals.totalPaisa;
        
        await Customer.updateOne({ _id: customer._id }, {
          $set: {
            "stats.totalOrders": Math.max(0, totalOrders),
            "stats.totalSpentPaisa": Math.max(0, totalSpentPaisa),
            "stats.averageOrderValuePaisa": totalOrders > 0 ? Math.round(totalSpentPaisa / totalOrders) : 0,
            "stats.lastPurchaseAt": now,
          },
        }, { session });
      }

      const customerSnapshot = customer ? {
        name: customer.name,
        mobile: customer.mobile,
        whatsappNumber: customer.whatsappNumber,
      } : undefined;

      // --- 5. UPDATE ORDER & INVOICE ---
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            customerId: customer?._id,
            customerSnapshot,
            items: totals.items,
            subtotalPaisa: totals.subtotalPaisa,
            discountPaisa: totals.discountPaisa,
            taxPaisa: totals.taxPaisa,
            totalPaisa: totals.totalPaisa,
            payments: input.payments,
            staffSnapshot: { id: user.id, name: user.name, role: user.role },
            notes: input.notes,
            completedAt: now,
          }
        },
        { session }
      );

      const invoiceSnapshot = {
        ...invoice.snapshot,
        customer: customerSnapshot,
        items: totals.items,
        subtotalPaisa: totals.subtotalPaisa,
        discountPaisa: totals.discountPaisa,
        taxPaisa: totals.taxPaisa,
        totalPaisa: totals.totalPaisa,
        payments: input.payments,
        issuedAt: now,
      };

      await Invoice.updateOne(
        { _id: invoice._id },
        { 
          $set: { 
            customerId: customer?._id,
            snapshot: invoiceSnapshot,
            pdfStatus: "PENDING"
          } 
        },
        { session }
      );

      // --- 6. AUDIT & LOGS ---
      await InventoryMovement.insertMany(totals.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        skuSnapshot: item.sku,
        productNameSnapshot: item.productName,
        type: "MANUAL_ADJUSTMENT",
        quantityDelta: -item.quantity,
        referenceType: "ORDER",
        referenceId: order._id,
        reason: `Edited sale ${order.invoiceNumber}`,
        performedBy: { id: user.id, name: user.name },
        occurredAt: now,
      })), { session });

      await AuditLog.create([{
        action: "SALE_EDITED",
        entityType: "ORDER",
        entityId: order._id,
        actor: { id: user.id, name: user.name, role: user.role },
        metadata: { invoiceNumber: order.invoiceNumber, totalPaisa: totals.totalPaisa, itemCount: totals.items.length },
        occurredAt: now,
      }], { session });

      result = {
        orderId: order._id.toString(),
        invoiceId: invoice._id.toString(),
        invoiceNumber: order.invoiceNumber,
        totalPaisa: totals.totalPaisa,
      };
    }, {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    });
    
    // Post-transaction: regenerate PDF
    try {
      await generateInvoicePdf(result.invoiceId);
    } catch (err) {
      console.error("Failed to regenerate PDF after edit", err);
    }

    return result;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
