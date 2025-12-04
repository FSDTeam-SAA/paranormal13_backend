import MedicineLog from "../models/medicineLogModel.js";
import MedicinePlan from "../models/medicinePlanModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { sendResponse } from "../utils/responseHandler.js";

// 1. Log an Action
export const logMedicineAction = catchAsync(async (req, res, next) => {
  const { planId, status, scheduledDate, scheduledTime } = req.body;

  if (!["taken", "skipped", "missed"].includes(status)) {
    return next(new AppError("Invalid status", 400));
  }

  const plan = await MedicinePlan.findOne({
    _id: planId,
    patient: req.user.id,
  });
  if (!plan) {
    return next(new AppError("Medicine Plan not found", 404));
  }

  const existingLog = await MedicineLog.findOne({
    patient: req.user.id,
    medicinePlan: planId,
    scheduledDate: new Date(scheduledDate),
    scheduledTime,
  });

  if (existingLog) {
    existingLog.status = status;
    existingLog.actionAt = Date.now();
    await existingLog.save();

    return sendResponse(res, 200, "Medicine log updated", { log: existingLog });
  }

  const log = await MedicineLog.create({
    patient: req.user.id,
    medicinePlan: planId,
    status,
    scheduledDate,
    scheduledTime,
    actionAt: Date.now(),
  });

  sendResponse(res, 201, "Medicine action logged", { log });
});

// 2. Get Daily Stats
export const getDailyStats = catchAsync(async (req, res, next) => {
  const { date } = req.query;
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

  sendResponse(res, 200, "Daily stats retrieved", { stats });
});