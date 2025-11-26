import express from "express";
import {
  getDashboardStats,
  getUsersByRole,
  updateUserStatus,
} from "../controllers/adminController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, restrictTo("admin"));

router.get("/stats", getDashboardStats);
router.get("/users", getUsersByRole);
router.patch("/users/:id/status", updateUserStatus);

export default router;
