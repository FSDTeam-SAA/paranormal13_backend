import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { ensureConversation } from "../utils/chatService.js";

const formatConversation = (conversation, currentUserId) => {
  const plain = conversation.toObject();
  const otherParticipants = plain.participants.filter(
    (participant) => participant._id.toString() !== currentUserId
  );

  return {
    _id: plain._id,
    topicType: plain.topicType,
    contextId: plain.contextId,
    lastMessage: plain.lastMessage,
    lastMessageAt: plain.lastMessageAt,
    participant: otherParticipants[0] || plain.participants[0],
  };
};

const verifyConversationAccess = async (conversationId, userId) => {
  return Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });
};

export const getMyConversations = catchAsync(async (req, res, next) => {
  const conversations = await Conversation.find({
    participants: req.user.id,
  })
    .populate("participants", "name avatarUrl role")
    .sort("-updatedAt");

  const formatted = conversations.map((conversation) =>
    formatConversation(conversation, req.user.id)
  );

  res.status(200).json({
    status: "success",
    results: formatted.length,
    data: { conversations: formatted },
  });
});

export const createConversation = catchAsync(async (req, res, next) => {
  const { participantId, topicType, contextId } = req.body;

  if (!participantId) {
    return next(new AppError("Please provide a participantId.", 400));
  }

  if (participantId === req.user.id) {
    return next(
      new AppError("You cannot start a conversation with yourself.", 400)
    );
  }

  const participant = await User.findById(participantId).select("_id role name");
  if (!participant) {
    return next(new AppError("Participant not found.", 404));
  }

  const conversation = await ensureConversation({
    participants: [req.user.id, participantId],
    topicType: topicType || "support",
    contextId,
    createdBy: req.user.id,
  });

  if (!conversation) {
    return next(new AppError("Unable to create conversation.", 500));
  }

  const populated = await Conversation.findById(conversation._id).populate(
    "participants",
    "name avatarUrl role"
  );

  res.status(201).json({
    status: "success",
    data: { conversation: formatConversation(populated, req.user.id) },
  });
});

export const getConversationMessages = catchAsync(async (req, res, next) => {
  const { conversationId } = req.params;
  const conversation = await verifyConversationAccess(
    conversationId,
    req.user.id
  );

  if (!conversation) {
    return next(new AppError("Conversation not found.", 404));
  }

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
  const skip = (page - 1) * limit;

  const messages = await Message.find({ conversation: conversation._id })
    .sort("createdAt")
    .skip(skip)
    .limit(limit)
    .populate("sender", "name avatarUrl role");

  await Message.updateMany(
    {
      conversation: conversation._id,
      sender: { $ne: req.user.id },
      readBy: { $ne: req.user.id },
    },
    { $addToSet: { readBy: req.user.id } }
  );

  res.status(200).json({
    status: "success",
    results: messages.length,
    data: { messages, pagination: { page, limit } },
  });
});

export const sendMessage = catchAsync(async (req, res, next) => {
  const { conversationId } = req.params;
  const text = (req.body.text || "").trim();

  if (!text) {
    return next(new AppError("Message text cannot be empty.", 400));
  }

  const conversation = await verifyConversationAccess(
    conversationId,
    req.user.id
  );

  if (!conversation) {
    return next(new AppError("Conversation not found.", 404));
  }

  const message = await Message.create({
    conversation: conversation._id,
    sender: req.user.id,
    text,
    readBy: [req.user.id],
  });

  conversation.lastMessage = text;
  conversation.lastMessageAt = new Date();
  await conversation.save();

  const populatedMessage = await Message.findById(message._id).populate(
    "sender",
    "name avatarUrl role"
  );

  res.status(201).json({
    status: "success",
    data: { message: populatedMessage },
  });
});
