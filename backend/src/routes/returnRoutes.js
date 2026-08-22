import express from "express";
import { processReturn, getReturns, getReturnById } from "../controllers/returnController.js";

const router = express.Router();

router.post("/", processReturn);
router.get("/", getReturns);
router.get("/:id", getReturnById);

export default router;
