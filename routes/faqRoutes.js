import express from "express";
import { getFaqs } from "../controllers/faqController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getFaqs);

export default router;
