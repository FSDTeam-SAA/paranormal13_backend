import Appointment from "../models/appointmentModel.js";
import DoctorSchedule from "../models/doctorScheduleModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

// 1. Create Appointment (Patient)
export const createAppointment = catchAsync(async (req, res, next) => {
  const { slotId, doctorId, notes } = req.body;

  // A) Check if the slot exists and is actually free
  const slot = await DoctorSchedule.findOne({
    _id: slotId,
    doctor: doctorId,
    isBooked: false,
  });

  if (!slot) {
    return next(new AppError("This time slot is no longer available.", 400));
  }

  // B) Lock the slot
  slot.isBooked = true;
  await slot.save();

  // C) Create the appointment
  const appointment = await Appointment.create({
    patient: req.user.id,
    doctor: doctorId,
    scheduleSlot: slotId,
    notes,
    status: "pending", // Default
  });

  res.status(201).json({
    status: "success",
    data: { appointment },
  });
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

  res.status(200).json({
    status: "success",
    results: appointments.length,
    data: { appointments },
  });
});

// 3. Get My Appointments (Doctor)
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

  res.status(200).json({
    status: "success",
    results: appointments.length,
    data: { appointments },
  });
});

// 4. Cancel Appointment (Both)
export const cancelAppointment = catchAsync(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    return next(new AppError("No appointment found with that ID", 404));
  }

  // Check permissions: Only the patient who booked it OR the doctor can cancel
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
      new AppError(
        "Cannot cancel an appointment that is already finished.",
        400
      )
    );
  }

  // A) Update Status
  appointment.status = "cancelled";
  await appointment.save();

  // B) Free up the slot so someone else can book
  await DoctorSchedule.findByIdAndUpdate(appointment.scheduleSlot, {
    isBooked: false,
  });

  res.status(200).json({
    status: "success",
    data: { appointment },
  });
});

// 5. Complete Appointment (Doctor Only)
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

  // Note: We do NOT free up the slot here, because the time was actually used.

  res.status(200).json({
    status: "success",
    data: { appointment },
  });
});
