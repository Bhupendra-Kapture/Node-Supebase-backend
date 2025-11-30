import express from "express";
import { getDeveloperPerformance } from "../controllers/developerPerformanceController.js";

const router = express.Router();

router.get("/developers/:name/performance", getDeveloperPerformance);

export default router;
