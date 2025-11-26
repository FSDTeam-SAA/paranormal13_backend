import Notification from "../models/notificationModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

// --- HELPER FUNCTION (To be used by other controllers) ---
// This saves the notification to Mongo AND emits it via Socket.io
export const sendNotification = async (
  io,
  recipientId,
  type,
  title,
  message,
  relatedId = null
) => {
  try {
    // 1. Save to Database
    const newNotification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      relatedId,
    });

    // 2. Emit Real-Time Event
    // We emit to the specific user's room (userId)
    if (io) {
      io.to(recipientId.toString()).emit("newNotification", newNotification);
    }

    return newNotification;
  } catch (error) {
    console.error("Notification Error:", error);
    // We don't throw here to avoid crashing the main request (e.g. Order creation)
  }
};

// --- API CONTROLLERS ---

// 1. Get My Notifications
export const getMyNotifications = catchAsync(async (req, res, next) => {
  const notifications = await Notification.find({ recipient: req.user.id })
    .sort("-createdAt")
    .limit(50); // Limit to last 50 to keep it fast

  // Count unread
  const unreadCount = await Notification.countDocuments({
    recipient: req.user.id,
    isRead: false,
  });

  res.status(200).json({
    status: "success",
    data: {
      unreadCount,
      notifications,
    },
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

  res.status(200).json({
    status: "success",
    data: { notification },
  });
});

// 3. Mark ALL as Read
export const markAllAsRead = catchAsync(async (req, res, next) => {
  await Notification.updateMany(
    { recipient: req.user.id, isRead: false },
    { isRead: true }
  );

  res.status(200).json({
    status: "success",
    message: "All notifications marked as read",
  });
});
