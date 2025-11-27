import express from "express";
import * as doctorController from "../controllers/doctorController.js";
import * as scheduleController from "../controllers/scheduleController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";
import reviewRoutes from "./reviewRoutes.js";

const router = express.Router();

router.use(protect);

// --- DOCTOR DASHBOARD (New Feature) ---
router.get(
  "/dashboard",
  restrictTo("doctor"),
  doctorController.getDoctorDashboard
);

// --- SEARCH DOCTORS ---
router.get("/", doctorController.getDoctors);
router.get("/:id", doctorController.getDoctor);

// --- SCHEDULES ---
router.get("/:doctorId/slots", scheduleController.getSlotsForDoctor);

// Add this line somewhere in the middle (before the export default)
// This tells Express: "If you see a route ending in /reviews, hand it over to the reviewRouter"
router.use("/:doctorId/reviews", reviewRoutes);

export default router;
