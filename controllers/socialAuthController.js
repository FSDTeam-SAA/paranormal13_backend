import { OAuth2Client } from "google-auth-library";
import appleSignin from "apple-signin-auth";
import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { issueAuthTokens } from "../utils/tokenService.js";

// Initialize Google Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * 1. GOOGLE AUTHENTICATION
 * Requires: { token, type: 'login'|'signup', role? }
 */
export const googleAuth = catchAsync(async (req, res, next) => {
  const { token, role, type } = req.body; // 'type' is crucial now

  if (!token) {
    return next(new AppError("Google token is required", 400));
  }

  // A. Verify Token with Google
  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch (err) {
    return next(new AppError("Invalid Google Token", 401));
  }

  const payload = ticket.getPayload();
  const { email, name, picture, sub: googleId } = payload;

  // B. Check if user exists
  let user = await User.findOne({
    $or: [{ googleId: googleId }, { email: email }],
  });

  // --- LOGIC SPLIT BASED ON INTENT ---

  // SCENARIO 1: LOGIN
  if (type === "login") {
    if (!user) {
      // 🛑 STOP: User doesn't exist, and they tried to "Login"
      return next(new AppError("No account found with this email. Please sign up first.", 404));
    }
    
    // If user exists, ensure Google ID is linked (in case they signed up via Email before)
    if (!user.googleId) {
      user.googleId = googleId;
      await user.save({ validateBeforeSave: false });
    }
  } 
  
  // SCENARIO 2: SIGNUP
  else if (type === "signup") {
    if (!user) {
      // ✅ CREATE: User doesn't exist, and they want to "Sign up"
      const newRole = role || "patient";
      
      user = await User.create({
        name: name,
        email: email,
        password: "social-login-google-" + Date.now(),
        role: newRole,
        doctorStatus: newRole === "doctor" ? "pending" : undefined,
        avatarUrl: picture,
        active: true,
        googleId: googleId,
      });
    } else {
      // If they try to "Sign up" but already have an account, we just log them in (Standard UX)
      // Pass through...
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save({ validateBeforeSave: false });
      }
    }
  } else {
    return next(new AppError("Invalid auth type. Must be 'login' or 'signup'", 400));
  }

  // D. Issue Tokens
  await issueAuthTokens(user, 200, res, "Google login successful");
});

/**
 * 2. APPLE AUTHENTICATION
 * Requires: { identityToken, fullName?, type: 'login'|'signup', role? }
 */
export const appleAuth = catchAsync(async (req, res, next) => {
  const { identityToken, fullName, role, type } = req.body;

  if (!identityToken) {
    return next(new AppError("Apple Identity Token is required", 400));
  }

  let appleIdTokenClaims;
  try {
    appleIdTokenClaims = await appleSignin.verifyIdToken(identityToken, {
      audience: process.env.APPLE_CLIENT_ID,
      ignoreExpiration: false,
    });
  } catch (err) {
    return next(new AppError("Invalid Apple Token", 401));
  }

  const { email, sub: appleSub } = appleIdTokenClaims;

  // B. Check if user exists
  let user = await User.findOne({
    $or: [{ appleSub: appleSub }, { email: email }],
  });

  // --- LOGIC SPLIT BASED ON INTENT ---

  // SCENARIO 1: LOGIN
  if (type === "login") {
    if (!user) {
      return next(new AppError("No account found with this email. Please sign up first.", 404));
    }
    // Link ID if missing
    if (!user.appleSub) {
      user.appleSub = appleSub;
      await user.save({ validateBeforeSave: false });
    }
  } 
  
  else if (type === "signup") {
    if (!user) {
      const nameStr = fullName
        ? `${fullName.givenName || ""} ${fullName.familyName || ""}`.trim()
        : "Apple User";
      const newRole = role || "patient";

      user = await User.create({
        name: nameStr || "Apple User",
        email: email,
        password: "social-login-apple-" + Date.now(),
        role: newRole,
        doctorStatus: newRole === "doctor" ? "pending" : undefined,
        active: true,
        appleSub: appleSub,
      });
    } else {
      if (!user.appleSub) {
        user.appleSub = appleSub;
        await user.save({ validateBeforeSave: false });
      }
    }
  } else {
    return next(new AppError("Invalid auth type. Must be 'login' or 'signup'", 400));
  }

  await issueAuthTokens(user, 200, res, "Apple login successful");
});