import express from "express";
import * as medicineLogController from "../controllers/medicineLogController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

// POST /api/medicine-logs -> User clicks "Taken"
router.post("/", medicineLogController.logMedicineAction);

// GET /api/medicine-logs/stats?date=2025-11-26 -> For the dashboard counters
router.get("/stats", medicineLogController.getDailyStats);

export default router;