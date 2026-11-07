import connectToDatabase from "../config/db.js";
import CashDrawer from "../models/CashDrawer.js";
import Order from "../models/Order.js";
import Return from "../models/Return.js";
import Expense from "../models/Expense.js";

// @route   GET /api/cash-drawer/status
// @desc    Get the current day's cash drawer status
// @access  Private
export const getDrawerStatus = async (req, res) => {
  try {
    await connectToDatabase();
    
    // Find the latest open drawer
    let drawer = await CashDrawer.findOne({ status: "OPEN" }).sort({ date: -1 });
    
    if (drawer) {
      // Recalculate cash movements since it opened
      const startOfDay = drawer.date;
      const endOfDay = new Date();

      // Aggregate cash sales
      const salesAggregation = await Order.aggregate([
        { $match: { completedAt: { $gte: startOfDay, $lte: endOfDay } } },
        { $unwind: "$payments" },
        { $match: { "payments.method": "CASH" } },
        { $group: { _id: null, totalCash: { $sum: "$payments.amountPaisa" } } }
      ]);
      const cashSales = salesAggregation[0]?.totalCash || 0;

      // Aggregate cash expenses
      const expenseAggregation = await Expense.aggregate([
        { $match: { date: { $gte: startOfDay, $lte: endOfDay }, paymentMethod: "CASH" } },
        { $group: { _id: null, totalCash: { $sum: "$amountPaisa" } } }
      ]);
      const cashExpenses = expenseAggregation[0]?.totalCash || 0;

      // Aggregate cash returns / refunds
      const returnAggregation = await Return.aggregate([
        { $match: { createdAt: { $gte: startOfDay, $lte: endOfDay } } },
        { $group: { _id: null, totalCash: { $sum: { $ifNull: ["$cashRefundPaisa", "$totalRefundPaisa"] } } } }
      ]);
      const cashReturns = returnAggregation[0]?.totalCash || 0;

      // Update drawer
      drawer.cashSalesPaisa = cashSales;
      drawer.cashExpensesPaisa = cashExpenses;
      drawer.cashRefundsPaisa = cashReturns;
      await drawer.save();
    }

    return res.json({ success: true, data: drawer });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not fetch drawer status" });
  }
};

// @route   POST /api/cash-drawer/open
// @desc    Open a new cash drawer for the day
// @access  Private
export const openDrawer = async (req, res) => {
  try {
    await connectToDatabase();
    const { openingBalancePaisa } = req.body;
    
    const existingOpen = await CashDrawer.findOne({ status: "OPEN" });
    if (existingOpen) {
      return res.status(400).json({ success: false, message: "A drawer is already open" });
    }

    // Use local midnight as the date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const drawer = await CashDrawer.create({
      date: today,
      openingBalancePaisa: openingBalancePaisa || 0,
      openedBy: req.user.id
    });

    return res.status(201).json({ success: true, data: drawer });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not open drawer" });
  }
};

// @route   POST /api/cash-drawer/close
// @desc    Close the active cash drawer
// @access  Private
export const closeDrawer = async (req, res) => {
  try {
    await connectToDatabase();
    const { actualClosingBalancePaisa, notes } = req.body;
    
    const drawer = await CashDrawer.findOne({ status: "OPEN" }).sort({ date: -1 });
    if (!drawer) {
      return res.status(400).json({ success: false, message: "No open drawer found" });
    }

    drawer.status = "CLOSED";
    drawer.actualClosingBalancePaisa = actualClosingBalancePaisa;
    drawer.closedBy = req.user.id;
    if (notes) drawer.notes = notes;
    
    await drawer.save();

    return res.json({ success: true, data: drawer });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not close drawer" });
  }
};
