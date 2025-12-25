import mongoose from "mongoose";

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
    frequency: { 
      type: String,
      enum: ["daily", "weekly", "interval", "specific_days"], 
      default: "daily",
    },
    interval: { type: Number, default: 1 }, 
    specificDays: { type: [Number], default: [] },

    startDate: { 
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: Date, 

    timesOfDay: { 
      type: [String], // Stores ["08:00 am", "02:00 pm"]
      required: true, 
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "At least one Time of Day is required.",
      },
    },

    instructions: { 
      type: String,
      trim: true,
    },
    
    doctorNotes: { 
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
export default MedicinePlan;