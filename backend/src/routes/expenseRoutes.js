import express from "express";
import { getExpenses, createExpense, updateExpense, deleteExpense } from "../controllers/expenseController.js";
import { requireRole } from "../middleware/auth.js";

const router = express.Router();
router.use(requireRole("ADMIN", "MANAGER"));

router.route("/")
  .get(getExpenses)
  .post(createExpense);

router.route("/:id")
  .put(updateExpense)
  .delete(deleteExpense);

export default router;
