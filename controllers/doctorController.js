import User from "../models/userModel.js";
import Appointment from "../models/appointmentModel.js";
import DoctorSchedule from "../models/doctorScheduleModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { sendResponse } from "../utils/responseHandler.js";

export const getDoctors = catchAsync(async (req, res, next) => {
  const { search, specialization, page, limit } = req.query;

  const queryObj = {
    role: "doctor",
    doctorStatus: "approved",
    specialization: { $exists: true, $ne: null, $nin: [""] },
    experienceYears: { $exists: true, $ne: null },
    hospitalName: { $exists: true, $ne: null, $nin: [""] },
  };

  if (specialization) {
    queryObj.specialization = { $regex: specialization, $options: "i" };
  }

  if (search) {
    queryObj.$or = [
      { name: { $regex: search, $options: "i" } },
      { hospitalName: { $regex: search, $options: "i" } },
      { specialization: { $regex: search, $options: "i" } },
    ];
  }

  const pageNum = page * 1 || 1;     
  const limitNum = limit * 1 || 10;  
  const skip = (pageNum - 1) * limitNum;

  const doctors = await User.find(queryObj)
    .skip(skip)
    .limit(limitNum);

  const totalDoctors = await User.countDocuments(queryObj);

  sendResponse(res, 200, "Doctors retrieved successfully", {
    results: doctors.length,
    total: totalDoctors,
    totalPages: Math.ceil(totalDoctors / limitNum),
    currentPage: pageNum,
    doctors,
  });
});

export const getDoctor = catchAsync(async (req, res, next) => {
  const doctor = await User.findOne({
    _id: req.params.id,
    role: "doctor",
    doctorStatus: "approved",
  }).select("-password -active -passwordChangedAt -__v");

  if (!doctor) {
    return next(new AppError("No approved doctor found with that ID", 404));
  }

  sendResponse(res, 200, "Doctor profile retrieved successfully", { doctor });
});

export const getDoctorDashboard = catchAsync(async (req, res, next) => {
  const doctorId = req.user.id;

  const totalAppointments = await Appointment.countDocuments({
    doctor: doctorId,
  });

  const completedAppointments = await Appointment.countDocuments({
    doctor: doctorId,
    status: "completed",
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todaySlots = await DoctorSchedule.find({
    doctor: doctorId,
    date: { $gte: todayStart, $lte: todayEnd },
  }).select("_id");

  const todaySlotIds = todaySlots.map((s) => s._id);

  const todayAppointments = await Appointment.countDocuments({
    doctor: doctorId,
    scheduleSlot: { $in: todaySlotIds },
  });

  const upcomingAppointments = await Appointment.find({
    doctor: doctorId,
    status: { $in: ["pending", "confirmed"] },
  })
    .populate("patient", "name avatarUrl")
    .populate("scheduleSlot", "date startTime")
    .sort("-createdAt")
    .limit(5);

  const takenAppointments = await Appointment.find({
    doctor: doctorId,
    status: "completed",
  })
    .populate("patient", "name avatarUrl")
    .populate("scheduleSlot", "date startTime")
    .sort("-updatedAt")
    .limit(5);

  sendResponse(res, 200, "Dashboard data retrieved successfully", {
    stats: {
      total: totalAppointments,
      completed: completedAppointments,
      today: todayAppointments,
    },
    lists: {
      upcoming: upcomingAppointments,
      taken: takenAppointments,
    },
  });
});