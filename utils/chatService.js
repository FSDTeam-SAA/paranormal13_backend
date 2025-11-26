import Conversation from "../models/conversationModel.js";

const normalizeParticipants = (participants = []) => {
  const ids = participants
    .map((id) => id && id.toString())
    .filter(Boolean);
  const unique = [...new Set(ids)];
  unique.sort();
  return unique;
};

export const ensureConversation = async ({
  participants,
  topicType = "support",
  contextId,
  createdBy,
}) => {
  const normalized = normalizeParticipants(participants);
  if (normalized.length < 2) return null;

  const participantsKey = normalized.join(":");

  let conversation = await Conversation.findOne({
    participantsKey,
    topicType,
  });

  if (conversation) {
    if (contextId) {
      conversation.contextId = contextId;
      await conversation.save();
    }
    return conversation;
  }

  conversation = await Conversation.create({
    participants: normalized,
    participantsKey,
    topicType,
    contextId,
    createdBy,
    lastMessageAt: new Date(),
  });

  return conversation;
};
