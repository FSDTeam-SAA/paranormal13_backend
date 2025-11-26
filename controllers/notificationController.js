import Notification from "../models/notificationModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const getMyNotifications = catchAsync(async (req, res, next) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const unreadOnly = req.query.unreadOnly === "true";

  const skip = (page - 1) * limit;
  const baseFilter = { recipient: req.user.id };
  const filter = unreadOnly ? { ...baseFilter, isRead: false } : baseFilter;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort("-createdAt").skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...baseFilter, isRead: false }),
  ]);

  res.status(200).json({
    status: "success",
    results: notifications.length,
    data: {
      notifications,
      pagination: { page, limit, total },
      unreadCount,
    },
  });
});

export const markNotificationRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user.id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return next(new AppError("Notification not found.", 404));
  }

  res.status(200).json({
    status: "success",
    data: { notification },
  });
});

export const markAllNotificationsRead = catchAsync(async (req, res, next) => {
  await Notification.updateMany(
    { recipient: req.user.id, isRead: false },
    { isRead: true }
  );

  res.status(200).json({
    status: "success",
    data: { unreadCount: 0 },
  });
});
