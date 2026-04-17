import Notification from "../models/notificationModel.js";
import FamilyMember from "../models/familyMemberModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { sendResponse } from "../utils/responseHandler.js";
import { sendNotification as sendFCMNotification } from "../utils/notification.js";

// --- HELPER FUNCTION (To be used by other controllers for Database Notifications) ---
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

// 4. Send Panic Alert to Family
export const sendPanic = catchAsync(async (req, res, next) => {
  const user = req.user;

  // 1. Find all accepted family members
  const connections = await FamilyMember.find({
    $or: [{ requester: user.id }, { recipient: user.id }],
    status: "accepted",
  }).populate("requester recipient");

  const recipients = connections.map((conn) => {
    return conn.requester.id === user.id ? conn.recipient : conn.requester;
  });

  if (recipients.length === 0) {
    return next(new AppError("No family members found to notify.", 404));
  }

  // 2. Send Notifications
  const title = "🚨 EMERGENCY ALERT";
  const body = `${user.name} is in a serious condition and needs immediate help!`;

  console.log("Recipients Tokens:", recipients.map(r => r.fcmToken));
  
  
  const results = await Promise.allSettled(
    recipients.map(async (recipient) => {
      // Send Database Notification
      await Notification.create({
        recipient: recipient.id,
        type: "panic",
        title,
        message: body,
        relatedId: user.id,
      });
      console.log(`Sending Panic FCM to: ${recipient.email || recipient.phone}, Token: ${recipient.fcmToken.substring(0, 10)}...`);
      
      // Send FCM Notification if token exists
      if (recipient.fcmToken) {


        await sendFCMNotification(recipient.fcmToken, {
          title,
          body,
          data: {
            type: "panic",
            senderName: user.name,
            caller_name: user.name, // For redundant mapping
            senderId: user.id.toString(),
            userId: user.id.toString(),
            phone: user.phone || "Emergency",
            avatarUrl: user.avatarUrl || ""
          }
        });
      } else {
        console.warn(`No FCM token found for recipient: ${recipient.email || recipient.phone}`);
      }

      // Emit via Socket.io if globally available
      const io = req.app.get("io");
      if (io) {
        io.to(recipient.id.toString()).emit("newNotification", { title, body, type: "panic" });
      }
    })
  );

  sendResponse(res, 200, "Emergency alerts sent to all family members", {
    notifiedCount: recipients.length,
  });
});

// 5. Send Test Notification
export const sendTestNotification = catchAsync(async (req, res, next) => {
  const { token, title, body, data, type } = req.body;
  const targetToken = token || req.user.fcmToken;

  if (!targetToken) {
    return next(new AppError("No FCM token provided and user has no registered token.", 400));
  }

  const notificationPayload = {
    title: title || "Test Notification",
    body: body || "This is a test notification from the server!",
    data: {
      ...(data || {}),
      type: type || (data && data.type) || "test",
    },
  };

  const response = await sendFCMNotification(targetToken, notificationPayload);

  sendResponse(res, 200, "Test notification sent successfully", {
    messageId: response,
    payload: notificationPayload,
  });
});

