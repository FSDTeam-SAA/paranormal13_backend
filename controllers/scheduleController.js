import DoctorSchedule from "../models/doctorScheduleModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

// 1. Create a Slot (Doctor)
export const createSlot = catchAsync(async (req, res, next) => {
  const { date, startTime, endTime } = req.body;

  // Basic validation
  if (startTime >= endTime) {
    return next(new AppError("Start time must be before end time", 400));
  }

  // Attempt to create.
  // Note: The unique index in the Model prevents duplicate slots for the same time/doctor.
  const slot = await DoctorSchedule.create({
    doctor: req.user.id,
    date,
    startTime,
    endTime,
  });

  res.status(201).json({
    status: "success",
    data: { slot },
  });
});

// 2. Get My Slots (Doctor Dashboard)
export const getMySlots = catchAsync(async (req, res, next) => {
  const slots = await DoctorSchedule.find({ doctor: req.user.id }).sort({
    date: 1,
    startTime: 1,
  });

  res.status(200).json({
    status: "success",
    results: slots.length,
    data: { slots },
  });
});

// 3. Delete Slot (Doctor)
export const deleteSlot = catchAsync(async (req, res, next) => {
  const slot = await DoctorSchedule.findOne({
    _id: req.params.id,
    doctor: req.user.id,
  });

  if (!slot) {
    return next(new AppError("No slot found with that ID", 404));
  }

  // CRITICAL: Prevent deleting if a patient has already booked it
  if (slot.isBooked) {
    return next(
      new AppError(
        "Cannot delete a booked slot. Please cancel the appointment instead.",
        400
      )
    );
  }

  await DoctorSchedule.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// 4. Get Slots For A Specific Doctor (Patient View)
// This is called via the doctorRoutes: /api/doctors/:doctorId/slots
export const getSlotsForDoctor = catchAsync(async (req, res, next) => {
  const { doctorId } = req.params;
  const { date } = req.query; // Optional filter: ?date=2025-11-30

  const query = {
    doctor: doctorId,
    isBooked: false, // Only show available slots
  };

  if (date) {
    query.date = date;
  }

  const slots = await DoctorSchedule.find(query).sort({
    date: 1,
    startTime: 1,
  });

  res.status(200).json({
    status: "success",
    results: slots.length,
    data: { slots },
  });
});
