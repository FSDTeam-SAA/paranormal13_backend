import express from "express";
import {
  signup,
  login,
  logout,
  refreshAccessToken,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  updatePassword,
} from "../controllers/authController.js";
import * as socialAuthController from "../controllers/socialAuthController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// --- PUBLIC ROUTES (No Token Needed) ---
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh-token", refreshAccessToken);

router.post("/forgotPassword", forgotPassword);
router.post("/verifyResetCode", verifyResetCode);
router.post("/resetPassword", resetPassword);

// --- PROTECTED ROUTES (Token Needed) ---
router.use(protect);

// Note: '/me' route has been moved to userRoutes.js

router.patch("/updateMyPassword", updatePassword);

router.post("/google", socialAuthController.googleAuth);

export default router;
