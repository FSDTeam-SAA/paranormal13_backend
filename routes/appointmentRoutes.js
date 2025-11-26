const express = require("express");
const appointmentController = require("../controllers/appointmentController");
const {
  protect,
  restrictTo,
  restrictToApprovedDoctor,
} = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require login
router.use(protect);

// --- PATIENT ROUTES ---
router.post(
  "/",
  restrictTo("patient"),
  appointmentController.createAppointment
);
router.get(
  "/me",
  restrictTo("patient"),
  appointmentController.getMyAppointments
);

// --- DOCTOR ROUTES ---
router.get(
  "/doctor/me",
  restrictTo("doctor"),
  // Gatekeeper: Unapproved doctors shouldn't see patient lists
  restrictToApprovedDoctor,
  appointmentController.getDoctorAppointments
);

// Mark as completed (e.g. after chat)
router.patch(
  "/:id/complete",
  restrictTo("doctor"),
  restrictToApprovedDoctor,
  appointmentController.markAppointmentCompleted
);

// --- SHARED ROUTES ---
// Both patient and doctor can cancel (logic inside controller handles permissions)
router.patch("/:id/cancel", appointmentController.cancelAppointment);

module.exports = router;
