import MedicineLog from "../models/medicineLogModel.js";
import MedicinePlan from "../models/medicinePlanModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

// 1. Log an Action (Taken / Skipped)
export const logMedicineAction = catchAsync(async (req, res, next) => {
  const { planId, status, scheduledDate, scheduledTime } = req.body;

  // Validate Status
  if (!["taken", "skipped", "missed"].includes(status)) {
    return next(new AppError("Invalid status", 400));
  }

  // Verify the plan belongs to this user
  const plan = await MedicinePlan.findOne({
    _id: planId,
    patient: req.user.id,
  });
  if (!plan) {
    return next(new AppError("Medicine Plan not found", 404));
  }

  // Check if already logged to prevent double-clicking
  const existingLog = await MedicineLog.findOne({
    patient: req.user.id,
    medicinePlan: planId,
    scheduledDate: new Date(scheduledDate),
    scheduledTime,
  });

  if (existingLog) {
    // Update existing log if they changed their mind (e.g. Skipped -> Taken)
    existingLog.status = status;
    existingLog.actionAt = Date.now();
    await existingLog.save();

    return res.status(200).json({
      status: "success",
      data: { log: existingLog },
    });
  }

  // Create new Log
  const log = await MedicineLog.create({
    patient: req.user.id,
    medicinePlan: planId,
    status,
    scheduledDate,
    scheduledTime,
    actionAt: Date.now(),
  });

  res.status(201).json({
    status: "success",
    data: { log },
  });
});

// 2. Get Daily Stats (For the Dashboard Counters: 2 Taken, 0 Missed)
export const getDailyStats = catchAsync(async (req, res, next) => {
  const { date } = req.query; // YYYY-MM-DD
  const queryDate = date ? new Date(date) : new Date();
  queryDate.setHours(0, 0, 0, 0);

  const logs = await MedicineLog.find({
    patient: req.user.id,
    scheduledDate: queryDate,
  });

  const stats = {
    taken: logs.filter((l) => l.status === "taken").length,
    skipped: logs.filter((l) => l.status === "skipped").length,
    missed: logs.filter((l) => l.status === "missed").length,
  };

  res.status(200).json({
    status: "success",
    data: { stats },
  });
});
