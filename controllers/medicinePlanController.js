import MedicinePlan from "../models/medicinePlanModel.js";
import FamilyMember from "../models/familyMemberModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

// 1. Create Medicine Plan (My Own)
export const createMedicinePlan = catchAsync(async (req, res, next) => {
  const plan = await MedicinePlan.create({
    patient: req.user.id,
    ...req.body,
  });

  res.status(201).json({
    status: "success",
    data: { plan },
  });
});

// 2. Get My Medicine Plans
export const getMyMedicinePlans = catchAsync(async (req, res, next) => {
  const plans = await MedicinePlan.find({
    patient: req.user.id,
    isActive: true,
  });

  res.status(200).json({
    status: "success",
    results: plans.length,
    data: { plans },
  });
});

// 3. Get A Family Member's Medicine Plans (New Feature)
export const getFamilyMemberPlans = catchAsync(async (req, res, next) => {
  const { memberId } = req.params;

  // SECURITY CHECK: Am I actually related to this person?
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

  // Fetch their active plans
  const plans = await MedicinePlan.find({
    patient: memberId,
    isActive: true,
  });

  res.status(200).json({
    status: "success",
    results: plans.length,
    data: { plans },
  });
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

  res.status(200).json({
    status: "success",
    data: { plan },
  });
});

// 5. Delete Plan (Soft Delete)
export const deleteMedicinePlan = catchAsync(async (req, res, next) => {
  const plan = await MedicinePlan.findOneAndUpdate(
    { _id: req.params.id, patient: req.user.id },
    { isActive: false }, // Soft delete
    { new: true }
  );

  if (!plan) {
    return next(new AppError("No plan found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
