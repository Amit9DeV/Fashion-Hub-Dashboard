import connectToDatabase from "../config/db.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";

export const getDashboardStats = async (req, res) => {
  try {
    await connectToDatabase();
    
    const now = new Date();
    const todayStart = new Date(now); 
    todayStart.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Today's orders & metrics
    const todayOrders = await Order.find({ completedAt: { $gte: todayStart } }).lean();
    
    let todaySales = 0;
    let todayItemsSold = 0;
    const paymentSummary = { UPI: 0, CASH: 0, CARD: 0 };
    
    for (const order of todayOrders) {
      todaySales += order.totalPaisa || 0;
      for (const item of order.items) {
        todayItemsSold += item.quantity || 0;
      }
      for (const payment of order.payments) {
        if (payment.method === "UPI") paymentSummary.UPI += payment.amountPaisa;
        else if (payment.method === "CASH") paymentSummary.CASH += payment.amountPaisa;
        else if (payment.method === "CARD") paymentSummary.CARD += payment.amountPaisa;
      }
    }

    const newCustomersCount = await Customer.countDocuments({ createdAt: { $gte: todayStart } });

    // 2. Recent Sales
    const recentSales = await Order.find().sort({ completedAt: -1 }).limit(10).lean();

    // 3. Inventory Attention
    const outOfStock = await Product.aggregate([
      { $unwind: "$variants" },
      { $match: { status: "ACTIVE", "variants.status": "ACTIVE", "variants.stock": 0 } },
      { $project: { name: 1, variant: "$variants", category: 1 } },
      { $sort: { name: 1 } },
      { $limit: 10 }
    ]);
    const outOfStockCount = await Product.aggregate([
      { $unwind: "$variants" },
      { $match: { status: "ACTIVE", "variants.status": "ACTIVE", "variants.stock": 0 } },
      { $count: "count" }
    ]);

    const lowStock = await Product.aggregate([
      { $unwind: "$variants" },
      { $match: { status: "ACTIVE", "variants.status": "ACTIVE", "variants.stock": { $gt: 0 }, $expr: { $lte: ["$variants.stock", { $ifNull: ["$variants.reorderLevel", 5] }] } } },
      { $project: { name: 1, variant: "$variants", category: 1 } },
      { $sort: { "variant.stock": 1 } },
      { $limit: 10 }
    ]);
    const lowStockCount = await Product.aggregate([
      { $unwind: "$variants" },
      { $match: { status: "ACTIVE", "variants.status": "ACTIVE", "variants.stock": { $gt: 0 }, $expr: { $lte: ["$variants.stock", { $ifNull: ["$variants.reorderLevel", 5] }] } } },
      { $count: "count" }
    ]);

    // 4. Sales Chart Data (Last 30 Days)
    const thirtyDayOrders = await Order.find({ completedAt: { $gte: thirtyDaysAgo } }).lean();
    
    // Aggregate by day string (e.g. "Aug 18")
    const salesByDate = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      salesByDate[dateStr] = 0;
    }
    
    // Top Products Aggregation
    const productSales = {};

    for (const order of thirtyDayOrders) {
      const dateStr = new Date(order.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      if (salesByDate[dateStr] !== undefined) {
        salesByDate[dateStr] += (order.totalPaisa / 100);
      }

      for (const item of order.items) {
        const key = item.productId.toString();
        if (!productSales[key]) {
          productSales[key] = { name: item.name, sold: 0, revenue: 0 };
        }
        productSales[key].sold += item.quantity;
        productSales[key].revenue += (item.sellingPricePaisa * item.quantity);
      }
    }

    const salesChartData = Object.entries(salesByDate).map(([date, revenue]) => ({ date, revenue }));
    
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return res.json({ 
      success: true, 
      data: { 
        today: {
          sales: todaySales,
          orders: todayOrders.length,
          itemsSold: todayItemsSold
        },
        newCustomers: newCustomersCount,
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
