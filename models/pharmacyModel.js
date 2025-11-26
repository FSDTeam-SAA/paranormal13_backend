const mongoose = require("mongoose");

const pharmacySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Pharmacy must have an owner"],
    },
    name: {
      type: String,
      required: [true, "Pharmacy name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    phone: String,

    address: {
      type: String,
      required: [true, "Pharmacy address is required"],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: [true, "Pharmacy coordinates are required"],
      },
    },

    rating: {
      type: Number,
      default: 4.5,
      min: 1,
      max: 5,
    },

    isOpen: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

pharmacySchema.index({ location: "2dsphere" });

const Pharmacy = mongoose.model("Pharmacy", pharmacySchema);
module.exports = Pharmacy;
