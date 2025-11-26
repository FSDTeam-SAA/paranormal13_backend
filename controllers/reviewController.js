import Review from "../models/reviewModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

// 1. Create a Review (Patient Only)
export const createReview = catchAsync(async (req, res, next) => {
  // Allow nested routes (if doctor ID is in URL)
  if (!req.body.doctor) req.body.doctor = req.params.doctorId;
  if (!req.body.patient) req.body.patient = req.user.id;

  const newReview = await Review.create(req.body);

  res.status(201).json({
    status: "success",
    data: { review: newReview },
  });
});

// 2. Get All Reviews (Public)
// Can be used generally /api/reviews or for specific doctor /api/doctors/:doctorId/reviews
export const getAllReviews = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.doctorId) filter = { doctor: req.params.doctorId };

  const reviews = await Review.find(filter)
    .populate({
      path: "patient",
      select: "name avatarUrl",
    })
    .sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: reviews.length,
    data: { reviews },
  });
});
