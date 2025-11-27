import mongoose from "mongoose";
import User from "./userModel.js";

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "Review can not be empty!"],
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, "Rating is required"],
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a doctor."],
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a patient."],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate reviews (One user, one review per doctor)
reviewSchema.index({ doctor: 1, patient: 1 }, { unique: true });

// STATIC METHOD: Calculate Average Rating
reviewSchema.statics.calcAverageRatings = async function (doctorId) {
  // 'this' points to the Model
  const stats = await this.aggregate([
    {
      $match: { doctor: doctorId },
    },
    {
      $group: {
        _id: "$doctor",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  if (stats.length > 0) {
    await User.findByIdAndUpdate(doctorId, {
      ratingsQuantity: stats[0].nRating,
      rating: stats[0].avgRating,
    });
  } else {
    // Reset if no reviews left
    await User.findByIdAndUpdate(doctorId, {
      ratingsQuantity: 0,
      rating: 4.5, // Default
    });
  }
};

// Call calcAverageRatings after a review is SAVED
reviewSchema.post("save", function () {
  // this.constructor points to the Model
  this.constructor.calcAverageRatings(this.doctor);
});

// Call calcAverageRatings after a review is UPDATED or DELETED
// We need to retrieve the document first to get access to the doctor ID
reviewSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) {
    await doc.constructor.calcAverageRatings(doc.doctor);
  }
});

const Review = mongoose.model("Review", reviewSchema);
export default Review;
