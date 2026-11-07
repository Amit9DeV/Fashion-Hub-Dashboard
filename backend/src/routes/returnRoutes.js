import express from "express";
import { processReturn, getReturns, getReturnById, processExchange } from "../controllers/returnController.js";
import { requireRole } from "../middleware/auth.js";

const router = express.Router();
router.use(requireRole("ADMIN", "MANAGER", "CASHIER"));

router.post("/", processReturn);
router.post("/exchange", processExchange);
router.get("/", getReturns);
router.get("/:id", getReturnById);

export default router;
