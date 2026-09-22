import express from "express";
import { cartHeartbeat } from "../controllers/cartController.js";

const router = express.Router();

router.post("/heartbeat", cartHeartbeat);

export default router;
