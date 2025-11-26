import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

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

  // Handle Image Upload (if middleware processed it)
  if (req.file && req.file.path) {
    messageData.image = req.file.path;
  }

  const newMessage = await Message.create(messageData);

  res.status(201).json({
    status: "success",
    data: { message: newMessage },
  });
});

// 2. Get Chat History (Between Me and User X)
export const getChatHistory = catchAsync(async (req, res, next) => {
  const { userId } = req.params; // The other person's ID

  const messages = await Message.find({
    $or: [
      { sender: req.user.id, recipient: userId },
      { sender: userId, recipient: req.user.id },
    ],
  })
    .sort("createdAt") // Oldest first (standard chat view)
    .populate("sender", "name avatarUrl")
    .populate("recipient", "name avatarUrl");

  // Optional: Mark messages as read when fetching history
  // Only mark those sent BY the other person TO me
  await Message.updateMany(
    { sender: userId, recipient: req.user.id, isRead: false },
    { isRead: true }
  );

  res.status(200).json({
    status: "success",
    results: messages.length,
    data: { messages },
  });
});

// 3. Get Inbox / Chat List (For the main Chat Screen)
export const getChatList = catchAsync(async (req, res, next) => {
  const currentUserId = req.user._id; // Ensure ObjectId

  // Aggregation Pipeline to summarize conversations
  const chatList = await Message.aggregate([
    // A. Match messages where I am sender OR recipient
    {
      $match: {
        $or: [{ sender: currentUserId }, { recipient: currentUserId }],
      },
    },
    // B. Sort by newest first
    { $sort: { createdAt: -1 } },
    // C. Group by the OTHER user
    {
      $group: {
        _id: {
          $cond: [{ $eq: ["$sender", currentUserId] }, "$recipient", "$sender"],
        },
        lastMessage: { $first: "$text" },
        lastMessageTime: { $first: "$createdAt" },
        // Capture specific fields to calculate unread count
        messages: { $push: "$$ROOT" },
      },
    },
    // D. Lookup User Details
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    // E. Unwind user details array
    { $unwind: "$userDetails" },
    // F. Project final shape
    {
      $project: {
        _id: 1,
        name: "$userDetails.name",
        avatarUrl: "$userDetails.avatarUrl",
        role: "$userDetails.role", // Useful to know if Doctor/Pharmacist
        lastMessage: 1,
        lastMessageTime: 1,
        // Calculate Unread Count manually using $filter
        unreadCount: {
          $size: {
            $filter: {
              input: "$messages",
              as: "msg",
              cond: {
                $and: [
                  { $eq: ["$$msg.recipient", currentUserId] }, // Message sent TO me
                  { $eq: ["$$msg.isRead", false] }, // AND is not read
                ],
              },
            },
          },
        },
      },
    },
    // G. Sort by most recent conversation
    { $sort: { lastMessageTime: -1 } },
  ]);

  res.status(200).json({
    status: "success",
    results: chatList.length,
    data: { chats: chatList },
  });
});
