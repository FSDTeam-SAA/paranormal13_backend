import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import { issueAuthTokens } from "../utils/tokenService.js";

// Mock Google Auth
export const googleAuth = catchAsync(async (req, res, next) => {
  const { email, name, googleId, avatar } = req.body;

  // 1. Check if user exists
  let user = await User.findOne({ email });

  // 2. If not, create new user
  if (!user) {
    user = await User.create({
      name,
      email,
      password: "social-login-placeholder-password", // Or generate random
      role: "patient",
      avatarUrl: avatar,
      active: true,
    });
  }

  // 3. Send token pair with standardized response
  await issueAuthTokens(user, 200, res, "Google login successful");
});