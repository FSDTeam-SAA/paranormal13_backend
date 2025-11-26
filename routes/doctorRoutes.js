const express = require("express");
const doctorController = require("../controllers/doctorController");
const scheduleController = require("../controllers/scheduleController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// 1. Public / Protected Routes (Patients searching for doctors)
router.use(protect);

// Get all doctors (with search & filters)
router.get("/", doctorController.getDoctors);

// Get specific doctor details
router.get("/:id", doctorController.getDoctor);

// 2. Doctor Schedule (Slots)
// A patient needs to see a specific doctor's available slots
router.get("/:doctorId/slots", scheduleController.getSlotsForDoctor);

module.exports = router;
