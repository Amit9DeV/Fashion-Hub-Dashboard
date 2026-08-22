import connectToDatabase from "../config/db.js";
import Order from "../models/Order.js";

// @route   GET /api/reports/sales
// @desc    Get sales analytics over a date range
// @access  Private
export const getSalesReport = async (req, res) => {
  try {
    await connectToDatabase();
    const { startDate, endDate } = req.query;
    
    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Ensure end date includes the whole day
    end.setHours(23, 59, 59, 999);
    start.setHours(0, 0, 0, 0);

    const matchStage = {
      $match: {
        completedAt: { $gte: start, $lte: end },
        status: "COMPLETED"
      }
    };

    // 1. Daily Revenue Trend
    const dailyRevenue = await Order.aggregate([
      matchStage,
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
          revenuePaisa: { $sum: "$totalPaisa" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 2. Category Performance
    const categoryPerformance = await Order.aggregate([
      matchStage,
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.category",
          revenuePaisa: { $sum: "$items.totalPaisa" },
          itemsSold: { $sum: "$items.quantity" }
        }
      },
      { $sort: { revenuePaisa: -1 } }
    ]);

    // 3. Payment Method Split
    const paymentSplit = await Order.aggregate([
      matchStage,
      { $unwind: "$payments" },
      {
        $group: {
          _id: "$payments.method",
          totalPaisa: { $sum: "$payments.amountPaisa" }
        }
      },
      { $sort: { totalPaisa: -1 } }
    ]);

    // 4. Overall Totals
    const totals = await Order.aggregate([
      matchStage,
      {
        $group: {
          _id: null,
          totalRevenuePaisa: { $sum: "$totalPaisa" },
          totalTaxPaisa: { $sum: "$taxPaisa" },
          totalDiscountPaisa: { $sum: "$discountPaisa" },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        dailyRevenue,
        categoryPerformance: categoryPerformance.map(c => ({ category: c._id || "Uncategorized", ...c })),
        paymentSplit: paymentSplit.map(p => ({ method: p._id, ...p })),
        totals: totals[0] || { totalRevenuePaisa: 0, totalTaxPaisa: 0, totalDiscountPaisa: 0, totalOrders: 0 },
        dateRange: { start, end }
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
};
