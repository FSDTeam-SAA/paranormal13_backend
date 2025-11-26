const MedicinePlan = require('../models/medicinePlanModel');
const catchAsync = require('../utils/catchAsync');

exports.createMedicinePlan = catchAsync(async (req, res, next) => {
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

  res.status(201).json({
    status: 'success',
    data: { plan }
  });
});

exports.getMyMedicinePlans = catchAsync(async (req, res, next) => {
  const plans = await MedicinePlan.find({ patient: req.user.id, isActive: true });

  res.status(200).json({
    status: 'success',
    results: plans.length,
    data: { plans }
  });
});

// Very simple "today" endpoint - frontend can map into upcoming/taken/missed
exports.getTodayPlans = catchAsync(async (req, res, next) => {
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

  res.status(200).json({
    status: 'success',
    results: plans.length,
    data: { plans }
  });
});

exports.updateMedicinePlan = catchAsync(async (req, res, next) => {
  const plan = await MedicinePlan.findOneAndUpdate(
    { _id: req.params.id, patient: req.user.id },
    req.body,
    { new: true }
  );

  res.status(200).json({
    status: 'success',
    data: { plan }
  });
});

exports.deleteMedicinePlan = catchAsync(async (req, res, next) => {
  await MedicinePlan.findOneAndDelete({ _id: req.params.id, patient: req.user.id });

  res.status(204).json({
    status: 'success',
    data: null
  });
});
