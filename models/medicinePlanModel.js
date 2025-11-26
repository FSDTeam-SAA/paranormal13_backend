const mongoose = require("mongoose");

const medicinePlanSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Plan must belong to a patient"],
    },
    name: {
      type: String,
      required: [true, "Medicine name is required"],
      trim: true,
    },
    dosage: {
      type: String,
      required: [true, "Dosage is required"],
    },
    type: {
      type: String,
      enum: ["Tablet", "Capsule", "Syrup", "Injection", "Other"],
      default: "Tablet",
    },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "custom"],
      default: "daily",
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: Date,

    reminderTimes: {
      type: [String],
      required: true,
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "At least one reminder time is required.",
      },
    },
    instructions: {
      type: String,
      trim: true,
    },
    prescribedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

medicinePlanSchema.index({ patient: 1, isActive: 1 });

const MedicinePlan = mongoose.model("MedicinePlan", medicinePlanSchema);
module.exports = MedicinePlan;
