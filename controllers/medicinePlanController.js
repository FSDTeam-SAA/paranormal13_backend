import MedicinePlan from "../models/medicinePlanModel.js";
import FamilyMember from "../models/familyMemberModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { sendResponse } from "../utils/responseHandler.js";

// 1. Create Medicine Plan
export const createMedicinePlan = catchAsync(async (req, res, next) => {
  const plan = await MedicinePlan.create({
    patient: req.user.id,
    ...req.body,
  });

  sendResponse(res, 201, "Medicine plan created successfully", { plan });
});

// 2. Get My Medicine Plans
export const getMyMedicinePlans = catchAsync(async (req, res, next) => {
  const plans = await MedicinePlan.find({
    patient: req.user.id,
    isActive: true,
  });

  sendResponse(res, 200, "Medicine plans retrieved successfully", { plans });
});

// 3. Get A Family Member's Medicine Plans
export const getFamilyMemberPlans = catchAsync(async (req, res, next) => {
  const { memberId } = req.params;

  const connection = await FamilyMember.findOne({
    $or: [
      { requester: req.user.id, recipient: memberId },
      { requester: memberId, recipient: req.user.id },
    ],
    status: "accepted",
  });

  if (!connection) {
    return next(
      new AppError("You are not connected to this family member.", 403)
    );
  }

  const plans = await MedicinePlan.find({
    patient: memberId,
    isActive: true,
  });

  sendResponse(res, 200, "Family member's plans retrieved successfully", { plans });
});

// 4. Update Plan
export const updateMedicinePlan = catchAsync(async (req, res, next) => {
  const plan = await MedicinePlan.findOneAndUpdate(
    { _id: req.params.id, patient: req.user.id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!plan) {
    return next(new AppError("No plan found with that ID", 404));
  }

  sendResponse(res, 200, "Medicine plan updated successfully", { plan });
});

// 5. Delete Plan
export const deleteMedicinePlan = catchAsync(async (req, res, next) => {
  const plan = await MedicinePlan.findOneAndUpdate(
    { _id: req.params.id, patient: req.user.id },
    { isActive: false },
    { new: true }
  );

  if (!plan) {
    return next(new AppError("No plan found with that ID", 404));
  }

  sendResponse(res, 200, "Medicine plan deleted successfully", null);
});