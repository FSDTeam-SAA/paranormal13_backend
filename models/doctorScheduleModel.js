import mongoose from "mongoose";

const doctorScheduleSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Schedule must belong to a doctor"],
    },
    date: {
      type: Date,
      required: [true, "Schedule must have a date"],
    },
    startTime: {
      type: String,
      required: [true, "Slot must have a start time"],
    },
    endTime: {
      type: String,
      required: [true, "Slot must have an end time"],
    },
    isBooked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

doctorScheduleSchema.index({ doctor: 1, date: 1 });

doctorScheduleSchema.index(
  { doctor: 1, date: 1, startTime: 1 },
  { unique: true }
);

const DoctorSchedule = mongoose.model("DoctorSchedule", doctorScheduleSchema);
export default DoctorSchedule;
