import MedicinePlan from "../models/medicinePlanModel.js";
import MedicineLog from "../models/medicineLogModel.js";
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
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const c = new Date(current);
  c.setHours(0, 0, 0, 0);
  const diffTime = Math.abs(c - s);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Checks if a time string like "08:00 am" is in the past for today
 */
const isTimeInPast = (timeStr) => {
  const now = new Date();
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":");

  hours = parseInt(hours, 10);
  minutes = parseInt(minutes, 10);

  if (modifier.toLowerCase() === "pm" && hours < 12) hours += 12;
  if (modifier.toLowerCase() === "am" && hours === 12) hours = 0;

  const scheduledDate = new Date();
  scheduledDate.setHours(hours, minutes, 0, 0);

  return scheduledDate < now;
};

export const createMedicinePlan = catchAsync(async (req, res, next) => {
  const plan = await MedicinePlan.create({
    patient: req.user.id,
    ...req.body,
  });
  sendResponse(res, 201, "Medicine plan created successfully", { plan });
});

export const getMyMedicinePlans = catchAsync(async (req, res, next) => {
  const plans = await MedicinePlan.find({
    patient: req.user.id,
    isActive: true,
  });

  // Optimization: Fetch only recent logs (e.g., last 30 days) to keep response fast
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const logs = await MedicineLog.find({
    patient: req.user.id,
    scheduledDate: { $gte: thirtyDaysAgo },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentDayOfWeek = today.getDay();

  // Helper to find plan and merge with log data
  const formatLogEntry = (log) => {
    const plan = plans.find(
      (p) => p._id.toString() === log.medicinePlan.toString(),
    );
    if (!plan) return null;
    return {
      ...plan.toObject(),
      logId: log._id,
      status: log.status,
      scheduledDate: log.scheduledDate,
      scheduledTime: log.scheduledTime,
      actionAt: log.actionAt,
    };
  };

  const taken = logs
    .filter((l) => l.status === "taken")
    .map(formatLogEntry)
    .filter(Boolean);
  const skipped = logs
    .filter((l) => l.status === "skipped")
    .map(formatLogEntry)
    .filter(Boolean);
  const missed = logs
    .filter((l) => l.status === "missed")
    .map(formatLogEntry)
    .filter(Boolean);

  // --- INFERRED MISSED LOGIC FOR TODAY ---
  const todayPlans = plans.filter((plan) => {
    if (plan.frequency === "daily") return true;
    if (plan.frequency === "specific_days")
      return plan.specificDays && plan.specificDays.includes(currentDayOfWeek);
    if (plan.frequency === "interval") {
      const start = new Date(plan.startDate);
      if (isSameDay(start, today)) return true;
      const diff = getDaysDiff(start, today);
      return diff % plan.interval === 0;
    }
    return false;
  });

  todayPlans.forEach((plan) => {
    plan.timesOfDay.forEach((time) => {
      const hasLog = logs.some(
        (l) =>
          l.medicinePlan.toString() === plan._id.toString() &&
          l.scheduledTime === time &&
          isSameDay(new Date(l.scheduledDate), today),
      );

      if (!hasLog && isTimeInPast(time)) {
        missed.push({
          ...plan.toObject(),
          status: "missed",
          scheduledDate: today,
          scheduledTime: time,
          isInferred: true,
        });
      }
    });
  });

  sendResponse(res, 200, "Medicine plans retrieved", {
    plans,
    taken,
    skipped,
    missed,
  });
});

export const getTodayPlans = catchAsync(async (req, res, next) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize "today" to midnight
  const currentDayOfWeek = today.getDay(); // 0=Sun, 1=Mon...

  const allPlans = await MedicinePlan.find({
    patient: req.user.id,
    isActive: true,
    startDate: { $lte: today }, // Must have started already
    $or: [{ endDate: null }, { endDate: { $gte: today } }], // Must not have ended
  });

  // 2. Filter plans that match today's schedule
  const todayPlans = allPlans.filter((plan) => {
    // A. Daily -> Always true
    if (plan.frequency === "daily") return true;

    // B. Specific Days -> Check if today (e.g., Mon=1) is in the array
    if (plan.frequency === "specific_days") {
      return plan.specificDays && plan.specificDays.includes(currentDayOfWeek);
    }

    // C. Interval (Every X days) -> Check math
    if (plan.frequency === "interval") {
      const start = new Date(plan.startDate);
      // If today IS the start date, take it
      if (isSameDay(start, today)) return true;

      const diff = getDaysDiff(start, today);
      return diff % plan.interval === 0;
    }

    return false;
  });

  sendResponse(res, 200, "Today's plans retrieved", { plans: todayPlans });
});

export const updateMedicinePlan = catchAsync(async (req, res, next) => {
  const plan = await MedicinePlan.findOneAndUpdate(
    { _id: req.params.id, patient: req.user.id },
    req.body,
    { new: true },
  );
  sendResponse(res, 200, "Medicine plan updated", { plan });
});

export const deleteMedicinePlan = catchAsync(async (req, res, next) => {
  await MedicinePlan.findOneAndDelete({
    _id: req.params.id,
    patient: req.user.id,
  });
  sendResponse(res, 200, "Medicine plan deleted", null);
});
