import express from "express";
import { processReturn, getReturns, getReturnById, processExchange } from "../controllers/returnController.js";

const router = express.Router();

router.post("/", processReturn);
router.post("/exchange", processExchange);
router.get("/", getReturns);
router.get("/:id", getReturnById);

export default router;
