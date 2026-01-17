import express from "express";
import {
  createAppointment,
  getMyAppointments,
  getDoctorAppointments,
  markAppointmentCompleted,
  cancelAppointment,
  startChat
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

router.patch(
  "/:id/start-chat",
  restrictTo("doctor"),
  restrictToApprovedDoctor,
  startChat
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