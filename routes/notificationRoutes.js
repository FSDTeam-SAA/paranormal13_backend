import express from "express";
import * as notificationController from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protect all routes
router.use(protect);

// 1. Get My Notifications
router.get("/", notificationController.getMyNotifications);

// 2. Mark Single Notification as Read
router.patch("/:id/read", notificationController.markAsRead);

// 3. Mark ALL as Read (Useful for "Mark all as read" button)
router.patch("/read-all", notificationController.markAllAsRead);

// 4. Panic Alert (Emergency)
router.post("/panic", notificationController.sendPanic);

// 5. Test Notification
router.post("/send-test", notificationController.sendTestNotification);

export default router;