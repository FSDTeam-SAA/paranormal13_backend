import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import sendEmail from "../utils/email.js";
import {
  passwordResetTemplate,
  welcomeTemplate,
} from "../utils/emailTemplates.js";
import { hashToken, issueAuthTokens } from "../utils/tokenService.js";
import { sendResponse } from "../utils/responseHandler.js";

const getIncomingRefreshToken = (req) =>
  req.cookies?.refreshToken ||
  req.body?.refreshToken ||
  req.headers["x-refresh-token"];

// --- AUTH CONTROLLERS ---

const cleanInput = (val) => (val === "" || val === null ? undefined : val);

export const signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: cleanInput(req.body.email),
    phone: cleanInput(req.body.phone),
    password: req.body.password,
    role: req.body.role || "patient",
    location: req.body.location,
    specialization: req.body.specialization,
    hospitalName: req.body.hospitalName,
    doctorStatus: req.body.role === "doctor" ? "pending" : undefined,
  });

  try {
    if (newUser.email) {
      await sendEmail({
        email: newUser.email,
        subject: "Welcome to MediRemind!",
        html: welcomeTemplate(newUser.name, newUser.role),
      });
    }
  } catch (err) {
    console.log("Welcome email failed to send:", err.message);
  }

  await issueAuthTokens(newUser, 201, res, "User registered successfully");
});

export const login = catchAsync(async (req, res, next) => {
  const { email, phone, password } = req.body;

  if ((!email && !phone) || !password) {
    return next(new AppError("Please provide (email or phone) and password", 400));
  }

  const user = await User.findOne({
    $or: [
      { email: email || "nomatch_placeholder" }, 
      { phone: phone || "nomatch_placeholder" }
    ]
  }).select("+password +doctorStatus");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect credentials", 401));
  }

  await issueAuthTokens(user, 200, res, "User Logged in successfully");
});

export const logout = catchAsync(async (req, res, next) => {
  const refreshToken = getIncomingRefreshToken(req);

  if (refreshToken) {
    const hashed = hashToken(refreshToken);
    await User.findOneAndUpdate(
      { refreshToken: hashed },
      { refreshToken: undefined, refreshTokenExpires: undefined }
    );
  }

  const isProduction = process.env.NODE_ENV === "production";
  const sameSite = isProduction ? "none" : "lax";
  const expiredCookieOptions = {
    expires: new Date(0),
    httpOnly: true,
    secure: isProduction,
    sameSite,
  };

  res.cookie("jwt", "", expiredCookieOptions);
  res.cookie("refreshToken", "", expiredCookieOptions);

  sendResponse(res, 200, "Logged out successfully", null);
});

export const refreshAccessToken = catchAsync(async (req, res, next) => {
  const incomingToken = getIncomingRefreshToken(req);

  if (!incomingToken) {
    return next(new AppError("Refresh token missing", 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(
      incomingToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );
  } catch (err) {
    return next(new AppError("Invalid or expired refresh token", 401));
  }

  const hashed = hashToken(incomingToken);

  const user = await User.findOne({
    _id: decoded.id,
    refreshToken: hashed,
    refreshTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Refresh token is no longer valid", 401));
  }

  await issueAuthTokens(user, 200, res, "Token refreshed successfully");
});

export const forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with that email address.", 404));
  }

  const resetCode = user.createPasswordResetCode();
  await user.save({ validateBeforeSave: false });

  try {
    const html = passwordResetTemplate(resetCode, user.name);

    await sendEmail({
      email: user.email,
      subject: "Your Password Reset Code (Valid for 10 min)",
      html,
    });

    sendResponse(res, 200, "Reset code sent to email", null);
  } catch (err) {
    console.error("EMAIL SENDING FAILED 💥:", err); 

    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError("There was an error sending the email. Try again later!", 500));
  }
});

// --- UPDATED VERIFY RESET CODE ---
export const verifyResetCode = catchAsync(async (req, res, next) => {
  // 1. Safety Check: Ensure code is provided
  if (!req.body.resetCode) {
    return next(new AppError("Please provide the resetCode.", 400));
  }

  // 2. Hash the incoming code
  const hashedCode = crypto
    .createHash("sha256")
    .update(req.body.resetCode) // FIXED: Uses resetCode now
    .digest("hex");

  const user = await User.findOne({
    passwordResetCode: hashedCode,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Reset code is invalid or has expired", 400));
  }

  sendResponse(res, 200, "Code is valid. You can now reset your password.", {
    valid: true,
  });
});

// --- UPDATED RESET PASSWORD ---
export const resetPassword = catchAsync(async (req, res, next) => {
  // 1. Safety Check
  if (!req.body.resetCode) {
    return next(new AppError("Please provide the resetCode.", 400));
  }

  const hashedCode = crypto
    .createHash("sha256")
    .update(req.body.resetCode) // FIXED: Uses resetCode now
    .digest("hex");

  const user = await User.findOne({
    passwordResetCode: hashedCode,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Reset code is invalid or has expired", 400));
  }

  user.password = req.body.password;
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await issueAuthTokens(user, 200, res, "Password reset successfully");
});

export const updatePassword = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("You must be logged in to change password", 401));
  }

  const user = await User.findById(req.user.id).select("+password");

  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError("Your current password is wrong.", 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  await issueAuthTokens(user, 200, res, "Password updated successfully");
});