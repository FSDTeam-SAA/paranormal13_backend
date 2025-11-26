import Notification from "../models/notificationModel.js";

const formatPayload = (item) => {
  if (!item || !item.recipient || !item.message) return null;

  return {
    recipient: item.recipient,
    sender: item.sender,
    type: item.type || "system",
    title: item.title || item.message,
    message: item.message,
    meta: item.meta || {},
  };
};

export const pushNotification = async (payload) => {
  const doc = formatPayload(payload);
  if (!doc) return null;

  try {
    return await Notification.create(doc);
  } catch (err) {
    console.log("Notification error:", err.message);
    return null;
  }
};

export const pushNotifications = async (notifications = []) => {
  const docs = notifications
    .map((notification) => formatPayload(notification))
    .filter(Boolean);

  if (!docs.length) return [];

  try {
    return await Notification.insertMany(docs);
  } catch (err) {
    console.log("Notification bulk error:", err.message);
    return [];
  }
};
