import express from "express";
import * as messageController from "../controllers/messageController.js";
import { protect } from "../middleware/authMiddleware.js";
import { uploadSingleImage } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// All chat routes require login
router.use(protect);

// 1. Send Message (Text OR Image)
router.post("/", uploadSingleImage("image"), messageController.sendMessage);

// 2. Get Chat List (Inbox - recent conversations)
router.get("/list", messageController.getChatList);

// 3. Get Chat History (Specific conversation with User X)
router.get("/history/:userId", messageController.getChatHistory);

export default router;
