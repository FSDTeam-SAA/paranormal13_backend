import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

// 1. Get Dashboard Stats
export const getDashboardStats = catchAsync(async (req, res, next) => {
  // Run queries in parallel for performance
  const [totalPatients, totalDoctors, totalPharmacists, recentOrders] =
    await Promise.all([
      User.countDocuments({ role: "patient" }),
      User.countDocuments({ role: "doctor" }),
      User.countDocuments({ role: "pharmacist" }),
      Order.find().sort("-createdAt").limit(5).populate("patient", "name"),
    ]);

  res.status(200).json({
    status: "success",
    data: {
      stats: {
        totalPatients,
        totalDoctors,
        totalPharmacists,
      },
      recentOrders,
    },
  });
});

// 2. Get Users by Role (e.g., ?role=doctor)
export const getUsersByRole = catchAsync(async (req, res, next) => {
  const { role } = req.query;

  // Default to patients if no role specified
  const filter = role ? { role } : { role: "patient" };

  const users = await User.find(filter)
    .select("name email phone role doctorStatus active avatarUrl createdAt")
    .sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: users.length,
    data: { users },
  });
});

// 3. Update User Status (Approve Doctor / Ban User)
export const updateUserStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { doctorStatus, active } = req.body;

  // We only allow updating specific administrative fields here
  const updateData = {};
  if (doctorStatus) updateData.doctorStatus = doctorStatus; // 'approved', 'rejected'
  if (active !== undefined) updateData.active = active; // true, false

  const user = await User.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: { user },
  });
});
