import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Appointment must have a doctor"],
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Appointment must have a patient"],
    },
    scheduleSlot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DoctorSchedule",
      required: [true, "Appointment must be linked to a time slot"],
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
    notes: {
      type: String,
      trim: true,
    },

    isChatActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// 1. Find all appointments for a specific doctor (e.g., Doctor Dashboard)
appointmentSchema.index({ doctor: 1, status: 1 });

// 2. Find all appointments for a specific patient (e.g., Patient "Upcoming" list)
appointmentSchema.index({ patient: 1, status: 1 });

const Appointment = mongoose.model("Appointment", appointmentSchema);
export default Appointment;
