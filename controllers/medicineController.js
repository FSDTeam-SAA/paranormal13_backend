import MedicinePlan from "../models/medicinePlanModel.js";
import MedicineLog from "../models/medicineLogModel.js";
import FamilyMember from "../models/familyMemberModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

const normalizeTimeString = (value) => {
  if (value === undefined || value === null) return null;
  let str = `${value}`.trim().toLowerCase();
  if (!str) return null;
  str = str.replace(/\./g, ":").replace(/\s+/g, " ");

  const match = str.match(/^(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?$/);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3];

  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (period === "pm" && hour < 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;
  if (hour >= 24 || minute >= 60) return null;

  return `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
};

const normalizeReminderTimes = (input) => {
  if (!input && input !== 0) return [];

  const list = Array.isArray(input)
    ? input
    : typeof input === "string"
    ? input
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [input];

  const normalized = list
    .map((value) => normalizeTimeString(value))
    .filter(Boolean);

  return [...new Set(normalized)];
};

const getDayRange = (dateInput) => {
  if (!dateInput) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { startOfDay: today, endOfDay: tomorrow };
  }

  const parsed = new Date(dateInput);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  const nextDay = new Date(parsed);
  nextDay.setDate(nextDay.getDate() + 1);
  return { startOfDay: parsed, endOfDay: nextDay };
};

const fetchActivePlansForDay = (patientId, { startOfDay, endOfDay }) => {
  return MedicinePlan.find({
    patient: patientId,
    isActive: true,
    startDate: { $lte: endOfDay },
    $or: [{ endDate: null }, { endDate: { $gte: startOfDay } }],
  }).sort({ createdAt: -1 });
};

const createTimelineSummary = () => ({
  taken: 0,
  skipped: 0,
  missed: 0,
  upcoming: 0,
});

const calculateTimelineForUser = async (userId, dayRange = getDayRange()) => {
  const range = dayRange || getDayRange();
  const plans = await fetchActivePlansForDay(userId, range);
  if (!plans.length) {
    return { summary: createTimelineSummary(), timeline: [] };
  }

  const planIds = plans.map((plan) => plan._id);
  const logs = await MedicineLog.find({
    patient: userId,
    medicinePlan: { $in: planIds },
    scheduledDate: { $gte: range.startOfDay, $lt: range.endOfDay },
  }).lean();

  const logMap = new Map();
  logs.forEach((log) =>
    logMap.set(`${log.medicinePlan.toString()}-${log.scheduledTime}`, log)
  );

  const now = new Date();
  const timeline = [];

  plans.forEach((plan) => {
    const reminderTimes = normalizeReminderTimes(plan.reminderTimes);

    reminderTimes.forEach((time) => {
      const [hours, minutes] = time.split(":").map((num) => parseInt(num, 10));
      const scheduledAt = new Date(range.startOfDay);
      scheduledAt.setHours(hours, minutes, 0, 0);

      const key = `${plan._id.toString()}-${time}`;
      const log = logMap.get(key);

      let status;
      if (log) {
        status = log.status;
      } else {
        status = scheduledAt < now ? "missed" : "upcoming";
      }

      timeline.push({
        planId: plan._id,
        medicineName: plan.name,
        dosage: plan.dosage,
        type: plan.type,
        frequency: plan.frequency,
        reminderTime: time,
        scheduledDate: scheduledAt.toISOString(),
        status,
        logId: log?._id,
        instructions: plan.instructions,
        doctorNotes: plan.doctorNotes,
      });
    });
  });

  timeline.sort(
    (a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)
  );

  const summary = timeline.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, createTimelineSummary());

  return { summary, timeline };
};

export const createMedicinePlan = catchAsync(async (req, res, next) => {
  const reminderTimes = normalizeReminderTimes(
    req.body.reminderTimes ?? req.body.timesOfDay
  );

  if (!reminderTimes.length) {
    return next(new AppError("Please add at least one reminder time.", 400));
  }

  const payload = {
    patient: req.user.id,
    name: req.body.name,
    dosage: req.body.dosage,
    type: req.body.type,
    frequency: req.body.frequency,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    reminderTimes,
    instructions: req.body.instructions,
    doctorNotes: req.body.doctorNotes,
    prescribedBy: req.body.prescribedBy,
  };

  const plan = await MedicinePlan.create(payload);

  res.status(201).json({
    status: "success",
    data: { plan },
  });
});

export const getMyMedicinePlans = catchAsync(async (req, res, next) => {
  const plans = await MedicinePlan.find({
    patient: req.user.id,
    isActive: true,
  }).sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: plans.length,
    data: { plans },
  });
});

export const getTodayPlans = catchAsync(async (req, res, next) => {
  const dayRange = getDayRange(req.query.date);
  if (!dayRange) {
    return next(
      new AppError("Please provide a valid date (YYYY-MM-DD).", 400)
    );
  }
  const plans = await fetchActivePlansForDay(req.user.id, dayRange);

  res.status(200).json({
    status: "success",
    results: plans.length,
    data: { plans },
  });
});

export const updateMedicinePlan = catchAsync(async (req, res, next) => {
  const allowedFields = [
    "name",
    "dosage",
    "type",
    "frequency",
    "startDate",
    "endDate",
    "instructions",
    "doctorNotes",
    "prescribedBy",
    "isActive",
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  if (req.body.reminderTimes || req.body.timesOfDay) {
    const reminderTimes = normalizeReminderTimes(
      req.body.reminderTimes ?? req.body.timesOfDay
    );

    if (!reminderTimes.length) {
      return next(new AppError("Please add at least one reminder time.", 400));
    }

    updates.reminderTimes = reminderTimes;
  }

  const plan = await MedicinePlan.findOneAndUpdate(
    { _id: req.params.id, patient: req.user.id },
    updates,
    { new: true, runValidators: true }
  );

  if (!plan) {
    return next(new AppError("No plan found with that ID.", 404));
  }

  res.status(200).json({
    status: "success",
    data: { plan },
  });
});

export const deleteMedicinePlan = catchAsync(async (req, res, next) => {
  const plan = await MedicinePlan.findOneAndDelete({
    _id: req.params.id,
    patient: req.user.id,
  });

  if (!plan) {
    return next(new AppError("No plan found with that ID.", 404));
  }

  await MedicineLog.deleteMany({
    patient: req.user.id,
    medicinePlan: req.params.id,
  });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const recordMedicineAction = catchAsync(async (req, res, next) => {
  const { status, scheduledDate, scheduledTime } = req.body;

  const allowedStatuses = ["taken", "skipped", "missed"];
  if (!allowedStatuses.includes(status)) {
    return next(
      new AppError(
        "Status must be taken, skipped, or missed when logging medicine.",
        400
      )
    );
  }

  const plan = await MedicinePlan.findOne({
    _id: req.params.id,
    patient: req.user.id,
    isActive: true,
  });

  if (!plan) {
    return next(new AppError("No plan found with that ID.", 404));
  }

  const normalizedTime = normalizeTimeString(
    scheduledTime || plan.reminderTimes?.[0]
  );

  if (!normalizedTime) {
    return next(new AppError("Please supply a valid reminder time.", 400));
  }

  const planTimes = normalizeReminderTimes(plan.reminderTimes);
  if (!planTimes.includes(normalizedTime)) {
    return next(
      new AppError("The provided reminder time does not match this plan.", 400)
    );
  }

  const dayRange = getDayRange(scheduledDate);
  if (!dayRange) {
    return next(
      new AppError("Please provide a valid date (YYYY-MM-DD).", 400)
    );
  }
  const { startOfDay } = dayRange;

  const log = await MedicineLog.findOneAndUpdate(
    {
      patient: req.user.id,
      medicinePlan: plan._id,
      scheduledDate: startOfDay,
      scheduledTime: normalizedTime,
    },
    { status, actionAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(200).json({
    status: "success",
    data: { log },
  });
});

export const getTodayTimeline = catchAsync(async (req, res, next) => {
  const dayRange = getDayRange(req.query.date);
  if (!dayRange) {
    return next(
      new AppError("Please provide a valid date (YYYY-MM-DD).", 400)
    );
  }
  const result = await calculateTimelineForUser(req.user.id, dayRange);

  res.status(200).json({
    status: "success",
    data: result,
  });
});

export const getFamilyMemberTodayTimeline = catchAsync(
  async (req, res, next) => {
    const { familyMemberId } = req.params;

    const connection = await FamilyMember.findOne({
      status: "accepted",
      canViewMedicine: true,
      $or: [
        { requester: req.user.id, recipient: familyMemberId },
        { requester: familyMemberId, recipient: req.user.id },
      ],
    });

    if (!connection) {
      return next(
        new AppError(
          "You do not have permission to view this family member's medicines.",
          403
        )
      );
    }

    const dayRange = getDayRange(req.query.date);
    if (!dayRange) {
      return next(
        new AppError("Please provide a valid date (YYYY-MM-DD).", 400)
      );
    }
    const result = await calculateTimelineForUser(familyMemberId, dayRange);

    res.status(200).json({
      status: "success",
      data: result,
    });
  }
);
