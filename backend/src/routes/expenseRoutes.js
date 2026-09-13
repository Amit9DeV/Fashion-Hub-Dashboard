import express from "express";
import { getExpenses, createExpense, deleteExpense } from "../controllers/expenseController.js";

const router = express.Router();

router.route("/")
  .get(getExpenses)
  .post(createExpense);

router.route("/:id")
  .delete(deleteExpense);

export default router;
