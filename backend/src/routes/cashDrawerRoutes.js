import express from "express";
import { getDrawerStatus, openDrawer, closeDrawer } from "../controllers/cashDrawerController.js";

const router = express.Router();

router.get("/status", getDrawerStatus);
router.post("/open", openDrawer);
router.post("/close", closeDrawer);

export default router;
