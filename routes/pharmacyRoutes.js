import express from "express";
import * as pharmacyController from "../controllers/pharmacyController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// 1. Get Nearby Pharmacies (Public or Protected, depending on preference)
// Usually protected so we know the user's location, but can be public if lat/lng sent in query
router.get("/nearby", pharmacyController.getNearbyPharmacies);

// 2. Pharmacy Management (Pharmacist Only)
router.use(protect);
router.use(restrictTo("pharmacist"));

// Create or Update "My Pharmacy"
router.post("/", pharmacyController.upsertMyPharmacy);

export default router;