import express from "express";
import {
  getNearbyPharmacies,
  upsertMyPharmacy,
} from "../controllers/pharmacyController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// public: list nearby
router.get("/nearby", getNearbyPharmacies);

// pharmacy owner
router.use(protect, restrictTo("pharmacist"));

router.post("/me", upsertMyPharmacy);

export default router;
