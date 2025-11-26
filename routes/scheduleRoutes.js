import express from "express";
import {
  createSlot,
  getMySlots,
  deleteSlot,
} from "../controllers/scheduleController.js";
import {
  protect,
  restrictTo,
  restrictToApprovedDoctor,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// 1. Protect all routes (Login required)
router.use(protect);

// 2. Restrict all routes to Doctors only
router.use(restrictTo("doctor"));

router
  .route("/")
  .post(restrictToApprovedDoctor, createSlot) // GATEKEEPER: Must be approved to create slots
  .get(getMySlots);

router.route("/:id").delete(deleteSlot);

export default router;
