import express from "express";
import {
  createAppointment,
  getMyAppointments,
  getDoctorAppointments,
  markAppointmentCompleted,
  cancelAppointment,
} from "../controllers/appointmentController.js";
import {
  protect,
  restrictTo,
  restrictToApprovedDoctor,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require login
router.use(protect);

// --- PATIENT ROUTES ---
router.post("/", restrictTo("patient"), createAppointment);
router.get("/me", restrictTo("patient"), getMyAppointments);

// --- DOCTOR ROUTES ---
router.get(
  "/doctor/me",
  restrictTo("doctor"),
  // Gatekeeper: Unapproved doctors shouldn't see patient lists
  restrictToApprovedDoctor,
  getDoctorAppointments
);

// Mark as completed (e.g. after chat)
router.patch(
  "/:id/complete",
  restrictTo("doctor"),
  restrictToApprovedDoctor,
  markAppointmentCompleted
);

// --- SHARED ROUTES ---
// Both patient and doctor can cancel (logic inside controller handles permissions)
router.patch("/:id/cancel", cancelAppointment);

export default router;
