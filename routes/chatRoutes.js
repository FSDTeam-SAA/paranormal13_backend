import express from "express";
import {
  getMyConversations,
  createConversation,
  getConversationMessages,
  sendMessage,
} from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getMyConversations).post(createConversation);

router
  .route("/:conversationId/messages")
  .get(getConversationMessages)
  .post(sendMessage);

export default router;
