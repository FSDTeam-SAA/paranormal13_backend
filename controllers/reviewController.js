import Review from "../models/reviewModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { sendResponse } from "../utils/responseHandler.js";

// 1. Create a Review
export const createReview = catchAsync(async (req, res, next) => {
  if (!req.body.doctor) req.body.doctor = req.params.doctorId;
  if (!req.body.patient) req.body.patient = req.user.id;

  const newReview = await Review.create(req.body);

  sendResponse(res, 201, "Review posted successfully", { review: newReview });
});

// 2. Get All Reviews
export const getAllReviews = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.doctorId) filter = { doctor: req.params.doctorId };

  const reviews = await Review.find(filter)
    .populate({
      path: "patient",
      select: "name avatarUrl",
    })
    .sort("-createdAt");

  sendResponse(res, 200, "Reviews retrieved successfully", { reviews });
});