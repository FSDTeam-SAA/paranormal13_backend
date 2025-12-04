import express from "express";
import * as reviewController from "../controllers/reviewController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

// mergeParams allows us to access :doctorId from the doctor routes
const router = express.Router({ mergeParams: true });

// GET reviews is Public (anyone can read)
router.get("/", reviewController.getAllReviews);

// POST review is Protected (Patient only)
router.use(protect);
router.use(restrictTo("patient"));

router.post("/", reviewController.createReview);

export default router;