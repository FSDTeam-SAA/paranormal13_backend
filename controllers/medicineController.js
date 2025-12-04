import MedicinePlan from "../models/medicinePlanModel.js";
import catchAsync from "../utils/catchAsync.js";
import { sendResponse } from "../utils/responseHandler.js";

// Legacy controller (if still used alongside medicinePlanController)
export const createMedicinePlan = catchAsync(async (req, res, next) => {
  const plan = await MedicinePlan.create({
    patient: req.user.id,
    name: req.body.name,
    dosage: req.body.dosage,
    frequency: req.body.frequency,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    timesOfDay: req.body.timesOfDay,
    instructions: req.body.instructions,
    doctorNotes: req.body.doctorNotes
  });

  sendResponse(res, 201, "Medicine plan created successfully", { plan });
});

export const getMyMedicinePlans = catchAsync(async (req, res, next) => {
  const plans = await MedicinePlan.find({ patient: req.user.id, isActive: true });
  sendResponse(res, 200, "Medicine plans retrieved", { plans });
});

export const getTodayPlans = catchAsync(async (req, res, next) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const plans = await MedicinePlan.find({
    patient: req.user.id,
    isActive: true,
    startDate: { $lte: tomorrow },
    $or: [{ endDate: null }, { endDate: { $gte: today } }]
  });

  sendResponse(res, 200, "Today's plans retrieved", { plans });
});

export const updateMedicinePlan = catchAsync(async (req, res, next) => {
  const plan = await MedicinePlan.findOneAndUpdate(
    { _id: req.params.id, patient: req.user.id },
    req.body,
    { new: true }
  );
  sendResponse(res, 200, "Medicine plan updated", { plan });
});

export const deleteMedicinePlan = catchAsync(async (req, res, next) => {
  await MedicinePlan.findOneAndDelete({ _id: req.params.id, patient: req.user.id });
  sendResponse(res, 204, "Medicine plan deleted", null);
});