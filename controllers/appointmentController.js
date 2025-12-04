import Appointment from "../models/appointmentModel.js";
import DoctorSchedule from "../models/doctorScheduleModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { sendResponse } from "../utils/responseHandler.js";
import { sendNotification } from "./notificationController.js"; // Import notification helper

export const createAppointment = catchAsync(async (req, res, next) => {
  const { slotId, doctorId, notes } = req.body;

  const slot = await DoctorSchedule.findOne({
    _id: slotId,
    doctor: doctorId,
    isBooked: false,
  });

  if (!slot) {
    return next(new AppError("This time slot is no longer available.", 400));
  }

  slot.isBooked = true;
  await slot.save();

  const appointment = await Appointment.create({
    patient: req.user.id,
    doctor: doctorId,
    scheduleSlot: slotId,
    notes,
    status: "pending",
  });

  await sendNotification(
    req.app.get("io"),
    doctorId,
    "appointment",
    "New Appointment",
    `You have a new appointment request from ${req.user.name}`,
    appointment._id
  );

  sendResponse(res, 201, "Appointment booked successfully", { appointment });
});

// 2. Get My Appointments (Patient)
export const getMyAppointments = catchAsync(async (req, res, next) => {
  const appointments = await Appointment.find({ patient: req.user.id })
    .populate({
      path: "doctor",
      select: "name specialization avatarUrl hospitalName",
    })
    .populate({
      path: "scheduleSlot",
      select: "date startTime endTime",
    })
    .sort("-createdAt");

  sendResponse(res, 200, "Appointments retrieved successfully", { appointments });
});

export const getDoctorAppointments = catchAsync(async (req, res, next) => {
  const appointments = await Appointment.find({ doctor: req.user.id })
    .populate({
      path: "patient",
      select: "name avatarUrl gender dateOfBirth",
    })
    .populate({
      path: "scheduleSlot",
      select: "date startTime endTime",
    })
    .sort("-createdAt");

  sendResponse(res, 200, "Doctor appointments retrieved successfully", {
    appointments,
  });
});

export const cancelAppointment = catchAsync(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    return next(new AppError("No appointment found with that ID", 404));
  }

  if (
    appointment.patient.toString() !== req.user.id &&
    appointment.doctor.toString() !== req.user.id
  ) {
    return next(
      new AppError("You are not authorized to cancel this appointment.", 403)
    );
  }

  if (
    appointment.status === "cancelled" ||
    appointment.status === "completed"
  ) {
    return next(
      new AppError("Cannot cancel an appointment that is already finished.", 400)
    );
  }

  appointment.status = "cancelled";
  await appointment.save();

  await DoctorSchedule.findByIdAndUpdate(appointment.scheduleSlot, {
    isBooked: false,
  });

  const isPatient = req.user.id === appointment.patient.toString();
  const recipientId = isPatient ? appointment.doctor : appointment.patient;
  const cancellerName = req.user.name;

  await sendNotification(
    req.app.get("io"),
    recipientId,
    "appointment",
    "Appointment Cancelled",
    `Appointment has been cancelled by ${cancellerName}`,
    appointment._id
  );

  sendResponse(res, 200, "Appointment cancelled successfully", { appointment });
});

export const markAppointmentCompleted = catchAsync(async (req, res, next) => {
  const appointment = await Appointment.findOne({
    _id: req.params.id,
    doctor: req.user.id,
  });

  if (!appointment) {
    return next(new AppError("Appointment not found.", 404));
  }

  appointment.status = "completed";
  await appointment.save();

  sendResponse(res, 200, "Appointment marked as completed", { appointment });
});