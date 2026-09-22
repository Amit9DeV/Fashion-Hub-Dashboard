import express from "express";
import { getExpenses, createExpense, updateExpense, deleteExpense } from "../controllers/expenseController.js";

const router = express.Router();

router.route("/")
  .get(getExpenses)
  .post(createExpense);

router.route("/:id")
  .put(updateExpense)
  .delete(deleteExpense);

export default router;
