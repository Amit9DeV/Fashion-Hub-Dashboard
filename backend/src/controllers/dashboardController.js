import connectToDatabase from "../config/db.js";
import Order from "../models/Order.js";
import ProductVariant from "../models/ProductVariant.js";
import Customer from "../models/Customer.js";
import Expense from "../models/Expense.js";

export const getDashboardStats = async (req, res) => {
  try {
    await connectToDatabase();
    
    const now = new Date();

    // IST is UTC+5:30. Compute today's midnight in IST as a UTC timestamp
    // so MongoDB Atlas (which stores in UTC) matches correctly.
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + IST_OFFSET_MS);
    const istMidnight = new Date(
      Date.UTC(
        nowIST.getUTCFullYear(),
        nowIST.getUTCMonth(),
        nowIST.getUTCDate(),
        0, 0, 0, 0
      ) - IST_OFFSET_MS
    );
    const todayStart = istMidnight;

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Today's orders & metrics (exclude fully returned orders)
    const todayOrders = await Order.find({ completedAt: { $gte: todayStart }, status: { $ne: "RETURNED" } }).lean();
    
    let todaySales = 0;
    let todayItemsSold = 0;
    const paymentSummary = { UPI: 0, CASH: 0, CARD: 0, OTHER: 0 };
    
    for (const order of todayOrders) {
      todaySales += order.totalPaisa || 0;
      for (const item of order.items) {
        todayItemsSold += item.quantity || 0;
      }
      for (const payment of order.payments) {
        const method = payment.method;
        if (paymentSummary[method] !== undefined) {
          paymentSummary[method] += payment.amountPaisa;
        } else {
          paymentSummary[method] = (paymentSummary[method] || 0) + payment.amountPaisa;
        }
      }
    }

    const newCustomersCount = await Customer.countDocuments({ createdAt: { $gte: todayStart } });
    const totalCustomersCount = await Customer.countDocuments();

    // 2. Recent Sales
    const recentSales = await Order.find().sort({ completedAt: -1 }).limit(10).lean();

    const inventoryLookup = [
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      { $match: { "product.status": "ACTIVE" } },
    ];

    const outOfStock = await ProductVariant.aggregate([
      { $match: { status: "ACTIVE", stock: 0 } },
      ...inventoryLookup,
      { $project: { name: "$product.name", variant: { _id: "$_id", color: "$color", size: "$size", sku: "$sku", stock: "$stock" } } },
      { $sort: { name: 1 } },
      { $limit: 10 },
    ]);
    const outOfStockCount = await ProductVariant.aggregate([
      { $match: { status: "ACTIVE", stock: 0 } },
      ...inventoryLookup,
      { $count: "count" },
    ]);

    const lowStock = await ProductVariant.aggregate([
      { $match: { status: "ACTIVE", stock: { $gt: 0 } } },
      { $match: { $expr: { $lte: ["$stock", { $ifNull: ["$reorderLevel", 5] }] } } },
      ...inventoryLookup,
      { $project: { name: "$product.name", variant: { _id: "$_id", color: "$color", size: "$size", sku: "$sku", stock: "$stock" } } },
      { $sort: { "variant.stock": 1 } },
      { $limit: 10 },
    ]);
    const lowStockCount = await ProductVariant.aggregate([
      { $match: { status: "ACTIVE", stock: { $gt: 0 } } },
      { $match: { $expr: { $lte: ["$stock", { $ifNull: ["$reorderLevel", 5] }] } } },
      ...inventoryLookup,
      { $count: "count" },
    ]);

    // 4. Sales Chart Data (Last 30 Days) — using IST-aware date keys
    const thirtyDayOrders = await Order.find({ completedAt: { $gte: thirtyDaysAgo }, status: { $ne: "RETURNED" } }).lean();
    
    // Build date keys in IST so they match the server-side locale
    const salesByDate = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      // Convert to IST for display label
      const dIST = new Date(d.getTime() + IST_OFFSET_MS);
      const dateStr = dIST.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
      salesByDate[dateStr] = 0;
    }

    for (const order of thirtyDayOrders) {
      const dateStr = new Date(order.completedAt).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata'
      });
      if (salesByDate[dateStr] !== undefined) {
        salesByDate[dateStr] += (order.totalPaisa / 100);
      }
    }

    const salesChartData = Object.entries(salesByDate).map(([date, revenue]) => ({ date, revenue }));

    // 5. Top Products — lifetime aggregation using MongoDB pipeline (accurate & efficient)
    // Group by productId+productName composite to prevent old placeholder orders
    // with the same productId but different product names from collapsing into one row.
    const topProductsAgg = await Order.aggregate([
      { $match: { status: { $ne: "RETURNED" } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: { productId: "$items.productId", productName: "$items.productName" },
          name: { $first: "$items.productName" },
          sold: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.totalPaisa" },
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]);

    const topProducts = topProductsAgg.map(p => ({
      name: p.name,
      sold: p.sold,
      revenue: p.revenue,
    }));

    // 5. All-time totals
    const allTimeAgg = await Order.aggregate([
      { $match: { status: { $ne: "RETURNED" } } },
      { $group: { _id: null, totalSales: { $sum: "$totalPaisa" }, totalOrders: { $sum: 1 } } }
    ]);
    const totalSales = allTimeAgg[0]?.totalSales || 0;
    const totalOrders = allTimeAgg[0]?.totalOrders || 0;

    // 6. Today's Expenses and Net Collections
    const todayExpensesAgg = await Expense.aggregate([
      { $match: { date: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: "$amountPaisa" } } }
    ]);
    const todayExpenses = todayExpensesAgg[0]?.total || 0;

    // 7. Store-wide Outstanding Customer Dues (Khata)
    const duesAgg = await Customer.aggregate([
      { $group: { _id: null, totalDues: { $sum: "$stats.totalDuesPaisa" } } }
    ]);
    const totalDuesAll = duesAgg[0]?.totalDues || 0;

    return res.json({ 
      success: true, 
      data: { 
        today: {
          sales: todaySales,
          orders: todayOrders.length,
          itemsSold: todayItemsSold,
          expenses: todayExpenses,
          netSales: Math.max(0, todaySales - todayExpenses),
        },
        totalSales,
        totalOrders,
        totalDues: totalDuesAll,
        newCustomers: newCustomersCount,
        totalCustomers: totalCustomersCount,
        paymentSummary,
        recentSales,
        inventoryAttention: {
          outOfStock,
          outOfStockCount: outOfStockCount[0]?.count || 0,
          lowStock,
          lowStockCount: lowStockCount[0]?.count || 0
        },
        salesChartData,
        topProducts
      } 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not fetch dashboard stats." });
  }
};
