import connectToDatabase from "../config/db.js";
import Order from "../models/Order.js";
import ProductVariant from "../models/ProductVariant.js";
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
          productSales[key] = { name: item.productName, sold: 0, revenue: 0 };
        }
        productSales[key].sold += item.quantity;
        productSales[key].revenue += (item.totalPaisa || (item.unitPricePaisa || 0) * item.quantity);
      }
    }

    const salesChartData = Object.entries(salesByDate).map(([date, revenue]) => ({ date, revenue }));
    
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // 5. All-time totals
    const allTimeAgg = await Order.aggregate([
      { $group: { _id: null, totalSales: { $sum: "$totalPaisa" }, totalOrders: { $sum: 1 } } }
    ]);
    const totalSales = allTimeAgg[0]?.totalSales || 0;
    const totalOrders = allTimeAgg[0]?.totalOrders || 0;

    return res.json({ 
      success: true, 
      data: { 
        today: {
          sales: todaySales,
          orders: todayOrders.length,
          itemsSold: todayItemsSold
        },
        totalSales,
        totalOrders,
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
