import express from "express";

import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import doctorRoutes from "./doctorRoutes.js";
import scheduleRoutes from "./scheduleRoutes.js";
import appointmentRoutes from "./appointmentRoutes.js";
import pharmacyRoutes from "./pharmacyRoutes.js";
import medicineRoutes from "./medicineRoutes.js";
import orderRoutes from "./orderRoutes.js";
import adminRoutes from "./adminRoutes.js";
import reviewRoutes from "./reviewRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import messageRoutes from "./messageRoutes.js";
import medicineLogRoutes from "./medicineLogRoutes.js";
import medicinePlanRoutes from "./medicinePlanRoutes.js";

const router = express.Router();

// Mount all routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/doctors", doctorRoutes);
router.use("/schedules", scheduleRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/pharmacies", pharmacyRoutes);
router.use("/medicines", medicineRoutes);
router.use("/orders", orderRoutes);
router.use("/admin", adminRoutes);
router.use("/reviews", reviewRoutes);
router.use("/notifications", notificationRoutes);
router.use("/messages", messageRoutes);
router.use("/medicine-logs", medicineLogRoutes);
router.use("/medicine-plans", medicinePlanRoutes);

export default router;