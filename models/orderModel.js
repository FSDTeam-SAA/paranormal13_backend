import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Order must belong to a patient"],
    },
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pharmacy",
      required: [true, "Order must be for a specific pharmacy"],
    },
    medicines: [
      {
        name: { type: String, required: true },
        dosage: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    address: {
      type: String,
      required: [true, "Order must have a delivery address"],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // lon, lat
        required: [true, "Delivery location coordinates are required"],
      },
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "delivering", "delivered", "cancelled"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ location: "2dsphere" });

const Order = mongoose.model("Order", orderSchema);
export default Order;
