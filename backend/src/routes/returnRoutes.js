import express from "express";
import { processReturn, getReturns, getReturnById } from "../controllers/returnController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth); // Re-using orders permission for returns

router.post("/", processReturn);
router.get("/", getReturns);
router.get("/:id", getReturnById);

export default router;
