import connectToDatabase from "../config/db.js";
import Order from "../models/Order.js";
import Return from "../models/Return.js";
import ProductVariant from "../models/ProductVariant.js";
import mongoose from "mongoose";

// @route   GET /api/reports/sales
// @desc    Get detailed store analytics over a date range
// @access  Private
export const getSalesReport = async (req, res) => {
  try {
    await connectToDatabase();
    const { startDate, endDate, dateFilter } = req.query;
    
    let start = new Date();
    let end = new Date();
    
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default based on dateFilter string if passed, else Last 30 days
      start.setDate(start.getDate() - 30);
    }
    
    // Ensure boundaries
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const matchStage = {
      $match: {
        completedAt: { $gte: start, $lte: end },
        status: "COMPLETED"
      }
    };

    // 1. Core Orders Aggregation (Bill-wise & Item-wise)
    // We look up ProductVariants to get costPricePaisa
    const baseOrders = await Order.aggregate([
      matchStage,
      { $unwind: "$items" },
      {
        $lookup: {
          from: "productvariants",
          localField: "items.variantId",
          foreignField: "_id",
          as: "variant"
        }
      },
      { $unwind: { path: "$variant", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$_id",
          completedAt: { $first: "$completedAt" },
          invoiceNumber: { $first: "$invoiceNumber" },
          customerSnapshot: { $first: "$customerSnapshot" },
          payments: { $first: "$payments" },
          discountPaisa: { $first: "$discountPaisa" },
          subtotalPaisa: { $first: "$subtotalPaisa" },
          totalPaisa: { $first: "$totalPaisa" }, // Net sales for this bill
          items: {
            $push: {
              productId: "$items.productId",
              variantId: "$items.variantId",
              productName: "$items.productName",
              category: "$items.category",
              size: "$variant.size",
              color: "$variant.color",
              sku: "$items.sku",
              quantity: "$items.quantity",
              sellingPricePaisa: "$items.unitPricePaisa",
              totalItemSalesPaisa: "$items.totalPaisa",
              costPricePaisa: {
                $cond: [
                  { $gt: ["$items.unitCostPaisa", 0] },
                  "$items.unitCostPaisa",
                  { $ifNull: ["$variant.costPricePaisa", 0] }
                ]
              },
              totalItemCostPaisa: {
                $cond: [
                  { $gt: ["$items.totalItemCostPaisa", 0] },
                  "$items.totalItemCostPaisa",
                  { $multiply: [{ $ifNull: ["$variant.costPricePaisa", 0] }, "$items.quantity"] }
                ]
              }
            }
          },
          totalItemsQty: { $sum: "$items.quantity" },
          totalBillCostPaisa: { $sum: { $ifNull: ["$items.totalItemCostPaisa", { $multiply: [{ $ifNull: ["$variant.costPricePaisa", 0] }, "$items.quantity"] }] } }
        }
      },
      {
        $addFields: {
          grossProfitPaisa: { $subtract: ["$totalPaisa", "$totalBillCostPaisa"] },
          marginPct: {
            $cond: [
              { $gt: ["$totalPaisa", 0] },
              { $multiply: [{ $divide: [{ $subtract: ["$totalPaisa", "$totalBillCostPaisa"] }, "$totalPaisa"] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { completedAt: -1 } }
    ]);

    // Calculate overall totals from Orders
    let totalSalesPaisa = 0;
    let totalCOGS = 0;
    let totalBills = baseOrders.length;
    let totalItemsSold = 0;
    let totalDiscountsPaisa = 0;
    let discountedBillsCount = 0;
    let salesBeforeDiscountPaisa = 0;

    // Data structures for grouping
    const trendMap = {}; // by YYYY-MM-DD
    const productMap = {}; // by variantId
    const categoryMap = {}; // by category name
    const sizeMap = {}; // by size string
    const colorMap = {}; // by color string
    const paymentMap = {}; // by method

    for (const bill of baseOrders) {
      totalSalesPaisa += bill.totalPaisa;
      totalCOGS += bill.totalBillCostPaisa;
      totalItemsSold += bill.totalItemsQty;
      totalDiscountsPaisa += (bill.discountPaisa || 0);
      
      if (bill.discountPaisa > 0) {
        discountedBillsCount++;
        salesBeforeDiscountPaisa += bill.subtotalPaisa || (bill.totalPaisa + bill.discountPaisa);
      }

      // Group payments
      if (bill.payments) {
        for (const p of bill.payments) {
          if (!paymentMap[p.method]) paymentMap[p.method] = { method: p.method, count: 0, amountPaisa: 0 };
          paymentMap[p.method].count += 1;
          paymentMap[p.method].amountPaisa += p.amountPaisa;
        }
      }

      // Group by date (Trend)
      const dateStr = new Date(bill.completedAt).toISOString().split('T')[0];
      if (!trendMap[dateStr]) trendMap[dateStr] = { date: dateStr, sales: 0, profit: 0, bills: 0, items: 0 };
      trendMap[dateStr].sales += bill.totalPaisa;
      trendMap[dateStr].profit += bill.grossProfitPaisa;
      trendMap[dateStr].bills += 1;
      trendMap[dateStr].items += bill.totalItemsQty;

      // Group items — key by variantId+productName so that historic orders with
      // different product names but the same placeholder variantId don't collapse
      for (const item of bill.items) {
        const vid = `${item.variantId?.toString() || 'unknown'}::${item.productName}`;
        const itemProfit = item.totalItemSalesPaisa - item.totalItemCostPaisa;
        
        // Products
        if (!productMap[vid]) productMap[vid] = { name: item.productName, sku: item.sku, category: item.category || 'Other', units: 0, sales: 0, cogs: 0, profit: 0 };
        productMap[vid].units += item.quantity;
        productMap[vid].sales += item.totalItemSalesPaisa;
        productMap[vid].cogs += item.totalItemCostPaisa;
        productMap[vid].profit += itemProfit;

        // Categories
        const cat = item.category || 'Other';
        if (!categoryMap[cat]) categoryMap[cat] = { category: cat, units: 0, sales: 0, cogs: 0, profit: 0 };
        categoryMap[cat].units += item.quantity;
        categoryMap[cat].sales += item.totalItemSalesPaisa;
        categoryMap[cat].cogs += item.totalItemCostPaisa;
        categoryMap[cat].profit += itemProfit;

        // Sizes
        if (item.size) {
          const sz = item.size;
          if (!sizeMap[sz]) sizeMap[sz] = { size: sz, units: 0, sales: 0, profit: 0 };
          sizeMap[sz].units += item.quantity;
          sizeMap[sz].sales += item.totalItemSalesPaisa;
          sizeMap[sz].profit += itemProfit;
        }

        // Colors
        if (item.color) {
          const col = item.color;
          if (!colorMap[col]) colorMap[col] = { color: col, units: 0, sales: 0, profit: 0 };
          colorMap[col].units += item.quantity;
          colorMap[col].sales += item.totalItemSalesPaisa;
          colorMap[col].profit += itemProfit;
        }
      }
    }

    // 2. Returns Aggregation
    const returnsAgg = await Return.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          totalReturnBills: { $addToSet: "$_id" },
          totalRefundPaisa: { $sum: "$items.refundPaisa" },
          totalReturnedUnits: { $sum: "$items.quantity" }
        }
      }
    ]);

    const returnStats = returnsAgg[0] || { totalReturnBills: [], totalRefundPaisa: 0, totalReturnedUnits: 0 };
    const returnedBillsCount = returnStats.totalReturnBills.length;
    const totalRefundPaisa = returnStats.totalRefundPaisa;
    const totalReturnedUnits = returnStats.totalReturnedUnits;

    // Adjust KPIs (Gross Profit = Net Sales - COGS)
    // Here we consider "Total Sales" as exactly what was sold (including discounts, excluding refunds).
    // Wait, refunds are cash out, so net sales = totalSalesPaisa - totalRefundPaisa
    const netSalesPaisa = totalSalesPaisa - totalRefundPaisa;
    // We should also theoretically adjust COGS for returned items, but to keep it safe, 
    // if a return puts item back in stock, it's an asset. The COGS of the sale is reversed.
    // For now, let's keep it simple: Gross Profit = Net Sales - totalCOGS (approx if we don't look up return COGS).
    // To be perfectly accurate, let's just use raw Sales - COGS for gross profit from completed orders, 
    // because returning an item zeroes out that specific order's item cost in our inventory system normally.
    const grossProfitPaisa = totalSalesPaisa - totalCOGS;
    const profitMargin = netSalesPaisa > 0 ? (grossProfitPaisa / netSalesPaisa) * 100 : 0;
    const avgBillValue = totalBills > 0 ? (netSalesPaisa / totalBills) : 0;

    // Convert Maps to Arrays
    const trend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));
    const products = Object.values(productMap).map(p => ({
      ...p,
      margin: p.sales > 0 ? (p.profit / p.sales) * 100 : 0
    })).sort((a, b) => b.sales - a.sales);
    const categories = Object.values(categoryMap).map(c => ({
      ...c,
      margin: c.sales > 0 ? (c.profit / c.sales) * 100 : 0
    })).sort((a, b) => b.sales - a.sales);
    const sizes = Object.values(sizeMap).sort((a, b) => b.units - a.units);
    const colors = Object.values(colorMap).sort((a, b) => b.units - a.units);
    
    // Payment percentages
    const paymentMethods = Object.values(paymentMap).map(p => ({
      ...p,
      percentage: totalSalesPaisa > 0 ? (p.amountPaisa / totalSalesPaisa) * 100 : 0
    })).sort((a, b) => b.amountPaisa - a.amountPaisa);

    res.json({
      success: true,
      data: {
        kpis: {
          totalSales: netSalesPaisa,
          grossProfit: grossProfitPaisa,
          totalBills,
          itemsSold: totalItemsSold,
          avgBillValue,
          profitMargin,
          totalDiscounts: totalDiscountsPaisa,
          totalReturns: totalRefundPaisa
        },
        trend,
        billWiseProfit: baseOrders.slice(0, 500).map(b => ({
          id: b._id,
          invoiceNumber: b.invoiceNumber,
          completedAt: b.completedAt,
          customer: b.customerSnapshot?.name || "Walk-in",
          itemsCount: b.totalItemsQty,
          salesPaisa: b.totalPaisa,
          cogsPaisa: b.totalBillCostPaisa,
          profitPaisa: b.grossProfitPaisa,
          marginPct: b.marginPct,
          paymentMethods: b.payments?.map(p => p.method).join(", ") || "",
          items: b.items
        })),
        productPerformance: products,
        categoryPerformance: categories,
        sizePerformance: sizes,
        colorPerformance: colors,
        paymentMethods,
        discounts: {
          totalAmount: totalDiscountsPaisa,
          discountedBills: discountedBillsCount,
          avgDiscount: discountedBillsCount > 0 ? (totalDiscountsPaisa / discountedBillsCount) : 0,
          salesBefore: salesBeforeDiscountPaisa,
          salesAfter: salesBeforeDiscountPaisa - totalDiscountsPaisa
        },
        returns: {
          returnBillsCount: returnedBillsCount,
          returnValue: totalRefundPaisa,
          returnedUnits: totalReturnedUnits,
          returnRate: totalSalesPaisa > 0 ? (totalRefundPaisa / totalSalesPaisa) * 100 : 0
        },
        dateRange: { start, end }
      }
    });

  } catch (error) {
    console.error("Report Generation Error:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};
