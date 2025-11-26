import express from "express";
import * as adminController from "../controllers/adminController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// GLOBAL PROTECTION: Login + Admin Role required for ALL routes below
router.use(protect);
router.use(restrictTo("admin"));

// 1. Dashboard Stats (Cards: Total Users, Doctors, etc.)
router.get("/stats", adminController.getDashboardStats);

// 2. User Management (List Users/Doctors/Pharmacists)
router.get("/users", adminController.getUsersByRole);

// 3. The "Gatekeeper" Route (Approve/Reject Doctor)
// Body: { "doctorStatus": "approved" } or { "active": false }
router.patch("/users/:id/status", adminController.updateUserStatus);

export default router;