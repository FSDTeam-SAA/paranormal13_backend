import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    participantsKey: {
      type: String,
      required: true,
      index: true,
    },
    topicType: {
      type: String,
      enum: ["support", "appointment", "order"],
      default: "support",
    },
    contextId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastMessage: String,
    lastMessageAt: Date,
  },
  {
    timestamps: true,
  }
);

conversationSchema.index(
  { participantsKey: 1, topicType: 1 },
  { unique: true }
);

conversationSchema.pre("validate", function (next) {
  if (this.participants && this.participants.length) {
    const sorted = this.participants.map((id) => id.toString()).sort();
    this.participantsKey = sorted.join(":");
  }
  next();
});

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
