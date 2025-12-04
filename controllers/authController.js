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

export const signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    password: req.body.password,
    role: req.body.role || "patient",
    location: req.body.location,
    specialization: req.body.specialization,
    hospitalName: req.body.hospitalName,
    // Ensure doctorStatus is pending by default if role is doctor
    doctorStatus: req.body.role === "doctor" ? "pending" : undefined,
  });

  try {
    await sendEmail({
      email: newUser.email,
      subject: "Welcome to MediRemind!",
      html: welcomeTemplate(newUser.name, newUser.role),
    });
  } catch (err) {
    console.log("Welcome email failed to send:", err.message);
    // We do not stop the signup process if email fails
  }

  // Issue tokens with custom success message
  await issueAuthTokens(newUser, 201, res, "User registered successfully");
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  const user = await User.findOne({ email }).select("+password +doctorStatus");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
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
    return next(
      new AppError("There is no user with that email address.", 404)
    );
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
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending the email. Try again later!", 500)
    );
  }
});

export const verifyResetCode = catchAsync(async (req, res, next) => {
  const hashedCode = crypto
    .createHash("sha256")
    .update(req.body.code)
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

export const resetPassword = catchAsync(async (req, res, next) => {
  const hashedCode = crypto
    .createHash("sha256")
    .update(req.body.code)
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
  // IMPORTANT: For development without auth, this route will fail if req.user is undefined.
  // Ideally, you should not test "updatePassword" without being logged in.
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