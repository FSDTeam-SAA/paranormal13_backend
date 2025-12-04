import DoctorSchedule from "../models/doctorScheduleModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { sendResponse } from "../utils/responseHandler.js";

// 1. Create a Slot
export const createSlot = catchAsync(async (req, res, next) => {
  const { date, startTime, endTime } = req.body;

  if (startTime >= endTime) {
    return next(new AppError("Start time must be before end time", 400));
  }

  const slot = await DoctorSchedule.create({
    doctor: req.user.id,
    date,
    startTime,
    endTime,
  });

  sendResponse(res, 201, "Slot created successfully", { slot });
});

// 2. Get My Slots
export const getMySlots = catchAsync(async (req, res, next) => {
  const slots = await DoctorSchedule.find({ doctor: req.user.id }).sort({
    date: 1,
    startTime: 1,
  });

  sendResponse(res, 200, "Slots retrieved successfully", { slots });
});

// 3. Delete Slot
export const deleteSlot = catchAsync(async (req, res, next) => {
  const slot = await DoctorSchedule.findOne({
    _id: req.params.id,
    doctor: req.user.id,
  });

  if (!slot) {
    return next(new AppError("No slot found with that ID", 404));
  }

  if (slot.isBooked) {
    return next(
      new AppError(
        "Cannot delete a booked slot. Please cancel the appointment instead.",
        400
      )
    );
  }

  await DoctorSchedule.findByIdAndDelete(req.params.id);

  sendResponse(res, 200, "Slot deleted successfully", null);
});

// 4. Get Slots For A Specific Doctor
export const getSlotsForDoctor = catchAsync(async (req, res, next) => {
  const { doctorId } = req.params;
  const { date } = req.query;

  const query = {
    doctor: doctorId,
    isBooked: false,
  };

  if (date) {
    query.date = date;
  }

  const slots = await DoctorSchedule.find(query).sort({
    date: 1,
    startTime: 1,
  });

  sendResponse(res, 200, "Slots retrieved successfully", { slots });
});