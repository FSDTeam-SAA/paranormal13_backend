import MedicinePlan from "../models/medicinePlanModel.js";
import catchAsync from "../utils/catchAsync.js";
import { sendResponse } from "../utils/responseHandler.js";

const isSameDay = (d1, d2) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const getDaysDiff = (start, current) => {
  const s = new Date(start); s.setHours(0,0,0,0);
  const c = new Date(current); c.setHours(0,0,0,0);
  const diffTime = Math.abs(c - s);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
};

export const createMedicinePlan = catchAsync(async (req, res, next) => {
  const plan = await MedicinePlan.create({
    patient: req.user.id,
    ...req.body
  });
  sendResponse(res, 201, "Medicine plan created successfully", { plan });
});

export const getMyMedicinePlans = catchAsync(async (req, res, next) => {
  const plans = await MedicinePlan.find({ patient: req.user.id, isActive: true });
  sendResponse(res, 200, "Medicine plans retrieved", { plans });
});

export const getTodayPlans = catchAsync(async (req, res, next) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize "today" to midnight
  const currentDayOfWeek = today.getDay(); // 0=Sun, 1=Mon...

  const allPlans = await MedicinePlan.find({
    patient: req.user.id,
    isActive: true,
    startDate: { $lte: today }, // Must have started already
    $or: [{ endDate: null }, { endDate: { $gte: today } }] // Must not have ended
  });

  // 2. Filter plans that match today's schedule
  const todayPlans = allPlans.filter(plan => {
    // A. Daily -> Always true
    if (plan.frequency === 'daily') return true;

    // B. Specific Days -> Check if today (e.g., Mon=1) is in the array
    if (plan.frequency === 'specific_days') {
      return plan.specificDays && plan.specificDays.includes(currentDayOfWeek);
    }

    // C. Interval (Every X days) -> Check math
    if (plan.frequency === 'interval') {
      const start = new Date(plan.startDate);
      // If today IS the start date, take it
      if (isSameDay(start, today)) return true;
      
      const diff = getDaysDiff(start, today);
      return (diff % plan.interval === 0);
    }

    return false;
  });

  sendResponse(res, 200, "Today's plans retrieved", { plans: todayPlans });
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