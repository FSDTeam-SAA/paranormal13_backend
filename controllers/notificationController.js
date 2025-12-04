import Notification from "../models/notificationModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { sendResponse } from "../utils/responseHandler.js";

// --- HELPER FUNCTION (To be used by other controllers) ---
export const sendNotification = async (
  io,
  recipientId,
  type,
  title,
  message,
  relatedId = null
) => {
  try {
    const newNotification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      relatedId,
    });

    if (io) {
      io.to(recipientId.toString()).emit("newNotification", newNotification);
    }

    return newNotification;
  } catch (error) {
    console.error("Notification Error:", error);
  }
};

// --- API CONTROLLERS ---

// 1. Get My Notifications
export const getMyNotifications = catchAsync(async (req, res, next) => {
  const notifications = await Notification.find({ recipient: req.user.id })
    .sort("-createdAt")
    .limit(50);

  const unreadCount = await Notification.countDocuments({
    recipient: req.user.id,
    isRead: false,
  });

  sendResponse(res, 200, "Notifications retrieved successfully", {
    unreadCount,
    notifications,
  });
});

// 2. Mark Notification as Read
export const markAsRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user.id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return next(new AppError("Notification not found", 404));
  }

  sendResponse(res, 200, "Notification marked as read", { notification });
});

// 3. Mark ALL as Read
export const markAllAsRead = catchAsync(async (req, res, next) => {
  await Notification.updateMany(
    { recipient: req.user.id, isRead: false },
    { isRead: true }
  );

  sendResponse(res, 200, "All notifications marked as read", null);
});