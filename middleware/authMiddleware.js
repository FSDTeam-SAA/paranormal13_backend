const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

// 1. PROTECT - Verify Token & User
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get token from Authorization header or Cookie
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.jwt) {
    // Allows auth via cookies if you implement frontend that way
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verify token
  // This throws an error if token is invalid or expired
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  // (Prevents access if the user was deleted but still has a valid token)
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token no longer exists.", 401)
    );
  }

  // 4) Check if user changed password after the token was issued
  // (Security feature: invalidates old tokens on password change)
  if (
    currentUser.changedPasswordAfter &&
    currentUser.changedPasswordAfter(decoded.iat)
  ) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  next();
});

// 2. RESTRICT - Role Based Access Control
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'doctor']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};

// 3. GATEKEEPER - Check Doctor Verification Status
// This ensures even if a doctor logs in, they can't do doctor stuff until approved
exports.restrictToApprovedDoctor = catchAsync(async (req, res, next) => {
  // First, ensure they are actually a doctor
  if (req.user.role !== "doctor") {
    return next(); // If not a doctor, this check might not apply or handled by restrictTo
  }

  // If they ARE a doctor, check status
  if (req.user.doctorStatus !== "approved") {
    return next(
      new AppError(
        "Your account is pending Admin approval. You cannot access this feature yet.",
        403
      )
    );
  }

  next();
});
