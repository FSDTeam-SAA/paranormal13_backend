import crypto from "crypto";
import jwt from "jsonwebtoken";
import { sendResponse } from "./responseHandler.js";

const daysToMs = (days) => Number(days) * 24 * 60 * 60 * 1000;

const signAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const signRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  });

const getRefreshExpiryDate = (token) => {
  const decoded = jwt.decode(token);
  if (decoded?.exp) {
    return new Date(decoded.exp * 1000);
  }
  const fallbackDays = Number(process.env.JWT_REFRESH_COOKIE_EXPIRES_IN || 30);
  return new Date(Date.now() + daysToMs(fallbackDays));
};

const persistRefreshToken = async (user, refreshToken) => {
  user.refreshToken = hashToken(refreshToken);
  user.refreshTokenExpires = getRefreshExpiryDate(refreshToken);
  await user.save({ validateBeforeSave: false });
};

const sanitizeUserForResponse = (user) => {
  user.password = undefined;
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.refreshToken = undefined;
  user.refreshTokenExpires = undefined;
  user.active = undefined;
  return user;
};

const attachAuthCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite = isProduction ? "none" : "lax";

  const accessCookieOptions = {
    expires: new Date(
      Date.now() + daysToMs(Number(process.env.JWT_COOKIE_EXPIRES_IN || 90))
    ),
    httpOnly: true,
    secure: isProduction,
    sameSite,
  };

  const refreshCookieOptions = {
    expires: new Date(
      Date.now() +
        daysToMs(Number(process.env.JWT_REFRESH_COOKIE_EXPIRES_IN || 30))
    ),
    httpOnly: true,
    secure: isProduction,
    sameSite,
  };

  res.cookie("jwt", accessToken, accessCookieOptions);
  res.cookie("refreshToken", refreshToken, refreshCookieOptions);
};

export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// Updated to accept a custom 'message'
export const issueAuthTokens = async (
  user,
  statusCode,
  res,
  message = "Authentication successful"
) => {
  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  await persistRefreshToken(user, refreshToken);
  sanitizeUserForResponse(user);
  attachAuthCookies(res, accessToken, refreshToken);
  const payload = {
    accessToken,
    refreshToken,
    role: user.role,
    _id: user._id,
    user,
  };

  sendResponse(res, statusCode, message, payload);
};