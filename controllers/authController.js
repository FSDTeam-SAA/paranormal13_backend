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

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // Prevent browser JS from reading cookie
    secure: process.env.NODE_ENV === 'production' // Only send on HTTPS in prod
  };

  res.cookie('jwt', token, cookieOptions);

  // Remove sensitive data from output
  user.password = undefined;
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.active = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user }
  });
};

// --- AUTH CONTROLLERS ---

export const signup = catchAsync(async (req, res, next) => {
  // We strictly allow only specific fields for signup to prevent security issues
  // (e.g., preventing a user from making themselves 'doctorStatus: approved' or 'role: admin')
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    password: req.body.password,
    role: req.body.role || 'patient', // Default to patient
    // Coordinates can be sent during signup if needed, or updated later
    location: req.body.location 
  });

  // Optional: Send Welcome Email
  try {
      await sendEmail({
        email: newUser.email,
        subject: 'Welcome to MediRemind!',
        html: welcomeTemplate(newUser.name, newUser.role)
      });
  } catch (err) {
      // Don't crash signup if email fails
      console.log('Welcome email failed to send:', err.message);
  }

  createSendToken(newUser, 201, res);
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password +doctorStatus');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) If everything ok, send token to client
  createSendToken(user, 200, res);
});

export const logout = (req, res) => {
  // Overwrite cookie with dummy data
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

// --- PASSWORD RESET FLOW ---

export const forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }

  // 2) Generate the random reset token/code
  const resetCode = user.createPasswordResetCode();
  
  // 3) Save it to DB (validateBeforeSave: false to ignore required fields like name/phone during this partial save)
  await user.save({ validateBeforeSave: false });

  // 4) Send it to user's email
  try {
    const html = passwordResetTemplate(resetCode, user.name);

    await sendEmail({
      email: user.email,
      subject: 'Your Password Reset Code (Valid for 10 min)',
      html
    });

    res.status(200).json({
      status: 'success',
      message: 'Reset code sent to email!'
    });
  } catch (err) {
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending the email. Try again later!', 500));
  }
});

export const verifyResetCode = catchAsync(async (req, res, next) => {
  // 1) Hash the code user sent to compare with DB
  const hashedCode = crypto
    .createHash('sha256')
    .update(req.body.code)
    .digest('hex');

  // 2) Find user with that code AND make sure it hasn't expired
  const user = await User.findOne({
    passwordResetCode: hashedCode,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('Reset code is invalid or has expired', 400));
  }

  res.status(200).json({
    status: 'success',
    message: 'Code is valid. You can now reset your password.'
  });
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const hashedCode = crypto
    .createHash('sha256')
    .update(req.body.code)
    .digest('hex');

  const user = await User.findOne({
    passwordResetCode: hashedCode,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('Reset code is invalid or has expired', 400));
  }

  // 3) Setup new password
  user.password = req.body.password;
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 4) Log the user in (send token)
  createSendToken(user, 200, res);
});

export const updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if current password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) Update password
  user.password = req.body.newPassword;
  await user.save();

  // 4) Log user in (send new token)
  createSendToken(user, 200, res);
});
