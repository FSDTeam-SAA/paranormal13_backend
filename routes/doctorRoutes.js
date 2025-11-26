import express from "express";
import { getDoctors, getDoctor } from "../controllers/doctorController.js";
import { getSlotsForDoctor } from "../controllers/scheduleController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// 1. Public / Protected Routes (Patients searching for doctors)
router.use(protect);

// Get all doctors (with search & filters)
router.get("/", getDoctors);

// Get specific doctor details
router.get("/:id", getDoctor);

// 2. Doctor Schedule (Slots)
// A patient needs to see a specific doctor's available slots
router.get("/:doctorId/slots", getSlotsForDoctor);

export default router;
