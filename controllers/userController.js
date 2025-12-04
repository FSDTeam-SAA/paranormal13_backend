import User from "../models/userModel.js";
import FamilyMember from "../models/familyMemberModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { sendResponse } from "../utils/responseHandler.js";

// 1. Get Current User Profile
export const getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  sendResponse(res, 200, "User profile retrieved successfully", { user });
});

// 2. Update User Profile
export const updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword.",
        400
      )
    );
  }

  const allowedFields = [
    "name", "phone", "gender", "dateOfBirth", 
    "specialization", "experienceYears", "about", "hospitalName",
    "location", "address"
  ];
  
  const filteredBody = {};
  Object.keys(req.body).forEach((el) => {
    if (allowedFields.includes(el)) filteredBody[el] = req.body[el];
  });

  if (req.file && req.file.path) {
    filteredBody.avatarUrl = req.file.path;
  }

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  sendResponse(res, 200, "Profile updated successfully", { user: updatedUser });
});

// --- FAMILY MEMBER LOGIC ---

// 3. Send Family Request
export const sendFamilyRequest = catchAsync(async (req, res, next) => {
  const { email, phone, relationship } = req.body;

  let targetUser;
  if (email) targetUser = await User.findOne({ email });
  else if (phone) targetUser = await User.findOne({ phone });

  if (!targetUser) {
    return next(new AppError("No user found with that email or phone number.", 404));
  }

  if (targetUser.id === req.user.id) {
    return next(new AppError("You cannot add yourself as a family member.", 400));
  }

  const existingConnection = await FamilyMember.findOne({
    requester: req.user.id,
    recipient: targetUser.id,
  });

  if (existingConnection) {
    return next(new AppError("You have already sent a request to this user.", 400));
  }

  const newMember = await FamilyMember.create({
    requester: req.user.id,
    recipient: targetUser.id,
    relationship: relationship || "Family",
    status: "pending",
  });

  sendResponse(res, 201, "Family request sent successfully", { request: newMember });
});

// 4. Respond to Request
export const respondToFamilyRequest = catchAsync(async (req, res, next) => {
  const { requestId } = req.params;
  const { status } = req.body;

  if (!["accepted", "rejected"].includes(status)) {
    return next(new AppError("Status must be accepted or rejected", 400));
  }

  const connection = await FamilyMember.findById(requestId);

  if (!connection) {
    return next(new AppError("Request not found", 404));
  }

  if (connection.recipient.toString() !== req.user.id) {
    return next(new AppError("This request was not sent to you", 403));
  }

  connection.status = status;
  await connection.save();

  sendResponse(res, 200, `Request ${status} successfully`, { connection });
});

// 5. Get My Accepted Family Members
export const getMyFamilyMembers = catchAsync(async (req, res, next) => {
  const connections = await FamilyMember.find({
    $or: [{ requester: req.user.id }, { recipient: req.user.id }],
    status: "accepted",
  })
    .populate("requester", "name avatarUrl phone")
    .populate("recipient", "name avatarUrl phone");

  const familyList = connections.map((conn) => {
    const isRequester = conn.requester._id.toString() === req.user.id;
    return {
      _id: conn._id,
      memberInfo: isRequester ? conn.recipient : conn.requester,
      relationship: conn.relationship,
      status: conn.status,
    };
  });

  sendResponse(res, 200, "Family members retrieved successfully", {
    familyMembers: familyList,
  });
});

// 6. Get Pending Requests
export const getReceivedFamilyRequests = catchAsync(async (req, res, next) => {
  const requests = await FamilyMember.find({
    recipient: req.user.id,
    status: "pending",
  }).populate("requester", "name avatarUrl email");

  sendResponse(res, 200, "Pending requests retrieved", { requests });
});

// 7. Remove Family Member
export const deleteFamilyMember = catchAsync(async (req, res, next) => {
  const connection = await FamilyMember.findById(req.params.id);

  if (!connection) {
    return next(new AppError("Connection not found", 404));
  }

  if (
    connection.requester.toString() !== req.user.id &&
    connection.recipient.toString() !== req.user.id
  ) {
    return next(new AppError("You are not authorized to delete this.", 403));
  }

  await FamilyMember.findByIdAndDelete(req.params.id);

  sendResponse(res, 200, "Family member removed successfully", null);
});