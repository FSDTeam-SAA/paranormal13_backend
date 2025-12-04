import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { sendResponse } from "../utils/responseHandler.js";

// 1. Send a Message
export const sendMessage = catchAsync(async (req, res, next) => {
  const { recipientId, text } = req.body;

  if (!recipientId) {
    return next(new AppError("Recipient ID is required", 400));
  }

  if (!text && !req.file) {
    return next(new AppError("Message must have text or an image", 400));
  }

  const messageData = {
    sender: req.user.id,
    recipient: recipientId,
    text: text || "",
    isRead: false,
  };

  if (req.file && req.file.path) {
    messageData.image = req.file.path;
  }

  const newMessage = await Message.create(messageData);

  // OPTIONAL: Trigger socket event here for Real-time chat (if not handled by client directly)
  // const io = req.app.get("io");
  // io.to(recipientId).emit("receiveMessage", newMessage);

  sendResponse(res, 201, "Message sent successfully", { message: newMessage });
});

// 2. Get Chat History
export const getChatHistory = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  const messages = await Message.find({
    $or: [
      { sender: req.user.id, recipient: userId },
      { sender: userId, recipient: req.user.id },
    ],
  })
    .sort("createdAt")
    .populate("sender", "name avatarUrl")
    .populate("recipient", "name avatarUrl");

  await Message.updateMany(
    { sender: userId, recipient: req.user.id, isRead: false },
    { isRead: true }
  );

  sendResponse(res, 200, "Chat history retrieved", { messages });
});

// 3. Get Chat List
export const getChatList = catchAsync(async (req, res, next) => {
  const currentUserId = req.user._id;

  const chatList = await Message.aggregate([
    {
      $match: {
        $or: [{ sender: currentUserId }, { recipient: currentUserId }],
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: {
          $cond: [{ $eq: ["$sender", currentUserId] }, "$recipient", "$sender"],
        },
        lastMessage: { $first: "$text" },
        lastMessageTime: { $first: "$createdAt" },
        messages: { $push: "$$ROOT" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    { $unwind: "$userDetails" },
    {
      $project: {
        _id: 1,
        name: "$userDetails.name",
        avatarUrl: "$userDetails.avatarUrl",
        role: "$userDetails.role",
        lastMessage: 1,
        lastMessageTime: 1,
        unreadCount: {
          $size: {
            $filter: {
              input: "$messages",
              as: "msg",
              cond: {
                $and: [
                  { $eq: ["$$msg.recipient", currentUserId] },
                  { $eq: ["$$msg.isRead", false] },
                ],
              },
            },
          },
        },
      },
    },
    { $sort: { lastMessageTime: -1 } },
  ]);

  sendResponse(res, 200, "Chat list retrieved", { chats: chatList });
});