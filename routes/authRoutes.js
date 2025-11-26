const express = require("express");
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// --- PUBLIC ROUTES (No Token Needed) ---
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", authController.logout);

router.post("/forgotPassword", authController.forgotPassword);
router.post("/verifyResetCode", authController.verifyResetCode);
router.post("/resetPassword", authController.resetPassword);

// --- PROTECTED ROUTES (Token Needed) ---
router.use(protect);

// Note: '/me' route has been moved to userRoutes.js

router.patch("/updateMyPassword", authController.updatePassword);

module.exports = router;
