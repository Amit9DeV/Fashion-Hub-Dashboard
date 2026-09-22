import connectToDatabase from "../config/db.js";
import Expense from "../models/Expense.js";

// @route   GET /api/expenses
// @desc    Get all expenses
// @access  Private
export const getExpenses = async (req, res) => {
  try {
    await connectToDatabase();
    
    const { startDate, endDate } = req.query;
    let query = {};
    
    if (startDate && endDate) {
      const end = new Date(endDate);
      const start = new Date(startDate);
      end.setHours(23, 59, 59, 999);
      start.setHours(0, 0, 0, 0);
      query.date = { $gte: start, $lte: end };
    }
    
    const expenses = await Expense.find(query).sort({ date: -1 }).lean();
    
    return res.json({ 
      success: true, 
      data: { expenses } 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not fetch expenses." });
  }
};

// @route   POST /api/expenses
// @desc    Create new expense
// @access  Private
export const createExpense = async (req, res) => {
  try {
    await connectToDatabase();
    const { title, amountPaisa, category, paymentMethod, date, notes } = req.body;
    
    if (!title || !amountPaisa || !category) {
      return res.status(400).json({ success: false, message: "Title, amount, and category are required." });
    }
    
    const expense = await Expense.create({
      title,
      amountPaisa,
      category,
      paymentMethod: paymentMethod || "CASH",
      date: date ? new Date(date) : new Date(),
      notes,
      createdBy: req.user ? req.user.id : undefined
    });
    
    return res.status(201).json({ success: true, data: expense, message: "Expense recorded successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not record expense." });
  }
};

// @route   PUT /api/expenses/:id
// @desc    Update an expense
// @access  Private
export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await connectToDatabase();
    const { title, amountPaisa, category, paymentMethod, date, notes } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (amountPaisa !== undefined) updates.amountPaisa = amountPaisa;
    if (category !== undefined) updates.category = category;
    if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
    if (date !== undefined) updates.date = new Date(date);
    if (notes !== undefined) updates.notes = notes;

    const expense = await Expense.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );
    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found." });
    }

    return res.json({ success: true, data: expense, message: "Expense updated successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not update expense." });
  }
};

// @route   DELETE /api/expenses/:id
// @desc    Delete an expense
// @access  Private
export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await connectToDatabase();
    
    const expense = await Expense.findByIdAndDelete(id);
    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found." });
    }
    
    return res.json({ success: true, message: "Expense deleted." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not delete expense." });
  }
};
