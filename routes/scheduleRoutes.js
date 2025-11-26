const express = require('express');
const scheduleController = require('../controllers/scheduleController');
const { protect, restrictTo, restrictToApprovedDoctor } = require('../middleware/authMiddleware');

const router = express.Router();

// 1. Protect all routes (Login required)
router.use(protect);

// 2. Restrict all routes to Doctors only
router.use(restrictTo('doctor'));

router
  .route('/')
  .post(restrictToApprovedDoctor, scheduleController.createSlot) // GATEKEEPER: Must be approved to create slots
  .get(scheduleController.getMySlots);

router
  .route('/:id')
  .delete(scheduleController.deleteSlot);

module.exports = router;