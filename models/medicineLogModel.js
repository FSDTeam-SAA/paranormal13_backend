import mongoose from "mongoose";

const medicineLogSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    medicinePlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MedicinePlan",
      required: true,
    },
    status: {
      type: String,
      enum: ["taken", "skipped", "missed"],
      required: true,
    },

    scheduledDate: {
      type: Date,
      required: true,
    },
    scheduledTime: {
      type: String,
      required: true,
    },
    actionAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

medicineLogSchema.index({ patient: 1, scheduledDate: 1 });

const MedicineLog = mongoose.model("MedicineLog", medicineLogSchema);
export default MedicineLog;
