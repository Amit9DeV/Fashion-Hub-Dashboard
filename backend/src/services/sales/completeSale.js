import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import connectToDatabase, { supportsTransactions } from "../../config/db.js";
import Product from "../../models/Product.js";
import ProductVariant from "../../models/ProductVariant.js";
import Customer from "../../models/Customer.js";
import Order from "../../models/Order.js";
import Invoice from "../../models/Invoice.js";
import InventoryMovement from "../../models/InventoryMovement.js";
import AuditLog from "../../models/AuditLog.js";
import WhatsappMessage from "../../models/WhatsappMessage.js";
import Counter from "../../models/Counter.js";
import Settings from "../../models/Settings.js";
import { calculateSale, compactCart, fiscalYearCode } from "../../services/sales/calculator.js";
import { STORE_SNAPSHOT } from "../../utils/store.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid database identifier.");

export const saleInputSchema = z.object({
  items: z.array(z.object({
    productId: objectId,
    variantId: objectId,
    quantity: z.number().int().positive().max(99),
    overriddenPricePaisa: z.number().int().positive().optional(),
    overriddenMrpPaisa: z.number().int().positive().optional(),
    overriddenCostPaisa: z.number().int().nonnegative().optional(),
    overriddenName: z.string().trim().max(200).optional(),
  })).min(1).max(100),
  customer: z.object({
    customerId: objectId.optional(),
    name: z.string().trim().max(120).optional(),
    mobile: z.string().trim().max(20).optional(),
    whatsappNumber: z.string().trim().max(20).optional(),
    billingWhatsAppConsent: z.boolean().optional(),
    marketingWhatsAppConsent: z.boolean().optional(),
  }).optional().nullable(),
  discountPaisa: z.number().int().nonnegative().default(0),
  payments: z.array(z.object({
    method: z.enum(["CASH", "UPI", "CARD", "OTHER"]),
    amountPaisa: z.number().int().positive(),
    reference: z.string().trim().max(100).optional(),
  })).max(4).default([]),
  notes: z.string().trim().max(1000).optional(),
  idempotencyKey: z.string().trim().min(10).max(100),
  // Accept full ISO datetime ("2026-09-14T00:00:00Z") or date-only ("2026-09-14")
  completedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, "Invalid date format").optional(),
});

function cleanPhone(value) {
  return value?.replace(/[^\d+]/g, "") || undefined;
}

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

async function resolveCustomer(input, user, session, now) {
  if (!input) return null;

  let customer = null;
  if (input.customerId) {
    customer = await Customer.findById(input.customerId).session(session);
    if (!customer) throw new Error("The selected customer no longer exists.");
    return customer;
  }

  const mobile = cleanPhone(input.mobile);
  const whatsappNumber = cleanPhone(input.whatsappNumber) || mobile;
  if (!input.name && !mobile && !whatsappNumber) return null;

  customer = mobile ? await Customer.findOne({ mobile }).session(session) : null;
  if (customer) {
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
    await Customer.updateOne({ _id: customer._id }, { $set: updates }, { session });
    return Customer.findById(customer._id).session(session);
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

export async function completeSale(rawInput, user) {
  const input = saleInputSchema.parse(rawInput);
  await connectToDatabase();
  
  // Idempotency check: if an order with this key already exists, return it immediately to prevent double-charging.
  const existingOrder = await Order.findOne({ idempotencyKey: input.idempotencyKey }).lean();
  if (existingOrder) {
    const existingInvoice = await Invoice.findOne({ orderId: existingOrder._id }).lean();
    return {
      orderId: existingOrder._id.toString(),
      invoiceId: existingInvoice?._id.toString() || existingOrder._id.toString(),
      invoiceNumber: existingOrder.invoiceNumber,
      totalPaisa: existingOrder.totalPaisa,
      whatsappMessageId: null,
      postSaleWarning: "Returned existing order (Idempotency check passed).",
    };
  }

  let session = await mongoose.startSession();
  let result;

  try {
    const isStandalone = !supportsTransactions();
    if (isStandalone) {
      session.endSession();
      session = undefined;
    }
    const runBlock = isStandalone ? (cb) => cb() : (cb, opts) => session.withTransaction(cb, opts);

    await runBlock(async () => {
      const now = input.completedAt ? new Date(input.completedAt) : new Date();
      const settings = await Settings.findOne().session(session);
      const globalTaxRate = settings?.taxRate ?? 0;

      const compactedItems = compactCart(input.items);
      const saleLines = [];

      const productIds = [...new Set(compactedItems.map(i => i.productId))];
      const variantIds = [...new Set(compactedItems.map(i => i.variantId))];

      const [products, variants] = await Promise.all([
        Product.find({ _id: { $in: productIds }, status: "ACTIVE" }).lean().session(session),
        ProductVariant.find({ _id: { $in: variantIds }, status: "ACTIVE" }).lean().session(session)
      ]);

      const productMap = new Map(products.map(p => [p._id.toString(), p]));
      const variantMap = new Map(variants.map(v => [v._id.toString(), v]));

      for (const requestedItem of compactedItems) {
        const product = productMap.get(requestedItem.productId.toString());
        if (!product) throw new Error("One of the selected products is unavailable.");

        const variant = variantMap.get(requestedItem.variantId.toString());
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
          unitCostPaisa: requestedItem.overriddenCostPaisa !== undefined ? requestedItem.overriddenCostPaisa : (variant.costPricePaisa || 0),
          unitPricePaisa: requestedItem.overriddenPricePaisa || variant.sellingPricePaisa,
          taxRate: product.taxRate ?? globalTaxRate,
          hsn: product.hsn || "",
        });
      }

      const totals = calculateSale(saleLines, input.discountPaisa);
      const amountPaidPaisa = input.payments.reduce((sum, payment) => sum + payment.amountPaisa, 0);
      if (amountPaidPaisa > totals.totalPaisa) {
        throw new Error("Payment total cannot exceed the final bill total.");
      }
      
      const duePaisa = totals.totalPaisa - amountPaidPaisa;
      let paymentStatus = "PAID";
      if (duePaisa > 0) {
        paymentStatus = amountPaidPaisa > 0 ? "PARTIAL" : "UNPAID";
      }

      const customer = await resolveCustomer(input.customer, user, session, now);
      const numbers = await nextSaleNumbers(session, now);

      const bulkOps = totals.items.map((item) => {
        const variantUpdate = { $inc: { stock: -item.quantity } };
        // We purposefully DO NOT update master pricing if overridden during billing.
        // Price overrides are meant to apply only to the specific invoice.
        return {
          updateOne: {
            filter: {
              _id: item.variantId,
              productId: item.productId,
              stock: { $gte: item.quantity },
              status: "ACTIVE"
            },
            update: variantUpdate
          }
        };
      });

      if (bulkOps.length > 0) {
        const bulkResult = await ProductVariant.bulkWrite(bulkOps, { session });
        if (bulkResult.modifiedCount !== bulkOps.length) {
          throw new Error("Stock changed while completing the sale. Please retry.");
        }
      }

      const customerSnapshot = customer ? {
        name: customer.name,
        mobile: customer.mobile,
        whatsappNumber: customer.whatsappNumber,
      } : undefined;
      const [order] = await Order.create([{
        ...numbers,
        customerId: customer?._id,
        customerSnapshot,
        items: totals.items,
        subtotalPaisa: totals.subtotalPaisa,
        discountPaisa: totals.discountPaisa,
        taxPaisa: totals.taxPaisa,
        cgstPaisa: totals.cgstPaisa,
        sgstPaisa: totals.sgstPaisa,
        totalPaisa: totals.totalPaisa,
        duePaisa,
        payments: input.payments,
        paymentStatus,
        staffSnapshot: { id: user.id, name: user.name, role: user.role },
        idempotencyKey: input.idempotencyKey,
        notes: input.notes,
        completedAt: now,
      }], { session });

      const invoiceSnapshot = {
        invoiceNumber: numbers.invoiceNumber,
        orderNumber: numbers.orderNumber,
        issuedAt: now,
        store: { ...STORE_SNAPSHOT, gstin: settings?.gstin || STORE_SNAPSHOT.gstin },
        customer: customerSnapshot,
        items: totals.items,
        subtotalPaisa: totals.subtotalPaisa,
        discountPaisa: totals.discountPaisa,
        taxPaisa: totals.taxPaisa,
        cgstPaisa: totals.cgstPaisa,
        sgstPaisa: totals.sgstPaisa,
        totalPaisa: totals.totalPaisa,
        duePaisa,
        payments: input.payments,
        paymentStatus,
      };
      const [invoice] = await Invoice.create([{
        invoiceNumber: numbers.invoiceNumber,
        orderId: order._id,
        customerId: customer?._id,
        publicToken: randomBytes(32).toString("base64url"),
        snapshot: invoiceSnapshot,
      }], { session });

      await InventoryMovement.insertMany(totals.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        skuSnapshot: item.sku,
        productNameSnapshot: item.productName,
        type: "SALE",
        quantityDelta: -item.quantity,
        referenceType: "ORDER",
        referenceId: order._id,
        reason: `Completed sale ${numbers.invoiceNumber}`,
        performedBy: { id: user.id, name: user.name },
        occurredAt: now,
      })), { session });

      if (customer) {
        const oldOrders = customer.stats?.totalOrders || 0;
        const oldSpent = customer.stats?.totalSpentPaisa || 0;
        const oldDues = customer.stats?.totalDuesPaisa || 0;
        const totalOrders = oldOrders + 1;
        const totalSpentPaisa = oldSpent + totals.totalPaisa;
        await Customer.updateOne({ _id: customer._id }, {
          $set: {
            "stats.totalOrders": totalOrders,
            "stats.totalSpentPaisa": totalSpentPaisa,
            "stats.averageOrderValuePaisa": Math.round(totalSpentPaisa / totalOrders),
            "stats.totalDuesPaisa": oldDues + duePaisa,
            "stats.firstPurchaseAt": customer.stats?.firstPurchaseAt || now,
            "stats.lastPurchaseAt": now,
          },
        }, { session });
      }

      await AuditLog.create([{
        action: "SALE_COMPLETED",
        entityType: "ORDER",
        entityId: order._id,
        actor: { id: user.id, name: user.name, role: user.role },
        metadata: { invoiceNumber: numbers.invoiceNumber, totalPaisa: totals.totalPaisa, itemCount: totals.items.length },
        occurredAt: now,
      }], { session });

      let whatsappMessageId = null;
      if (customer?.consents?.billingWhatsApp && customer.whatsappNumber) {
        const [message] = await WhatsappMessage.create([{
          customerId: customer._id,
          orderId: order._id,
          invoiceId: invoice._id,
          type: "INVOICE",
          category: "TRANSACTIONAL",
          phoneNumber: customer.whatsappNumber,
          templateName: process.env.WHATSAPP_TEMPLATE_NAME || "fashion_hub_invoice",
          status: "QUEUED",
          queuedAt: now,
        }], { session });
        whatsappMessageId = message._id.toString();
      }

      result = {
        orderId: order._id.toString(),
        invoiceId: invoice._id.toString(),
        invoiceNumber: numbers.invoiceNumber,
        totalPaisa: totals.totalPaisa,
        whatsappMessageId,
      };
    }, {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    });

    return result;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
