import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

// 1. Get Dashboard Stats
export const getDashboardStats = catchAsync(async (req, res, next) => {
  // A. Basic Counts
  const [totalPatients, totalDoctors, totalPharmacists, recentOrders] =
    await Promise.all([
      User.countDocuments({ role: "patient" }),
      User.countDocuments({ role: "doctor" }),
      User.countDocuments({ role: "pharmacist" }),
      Order.find().sort("-createdAt").limit(5).populate("patient", "name"),
    ]);

  // B. Sell Report (Graph Data) - Group Orders by Month
  // We look at the last 6 months
  const salesStats = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
        },
        status: "delivered", // Only count completed sales
      },
    },
    {
      $group: {
        _id: { $month: "$createdAt" }, // Group by Month Number (1-12)
        count: { $sum: 1 }, // Count orders
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Format for Frontend (Map 1 -> Jan, 2 -> Feb, etc.)
  const months = [
    "",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const formattedSales = salesStats.map((item) => ({
    month: months[item._id],
    orders: item.count,
  }));

  res.status(200).json({
    status: "success",
    data: {
      stats: {
        totalPatients,
        totalDoctors,
        totalPharmacists,
      },
      salesReport: formattedSales,
      recentOrders,
    },
  });
});

// 2. Get Users by Role
export const getUsersByRole = catchAsync(async (req, res, next) => {
  const { role } = req.query;
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

  const updateData = {};
  if (doctorStatus) updateData.doctorStatus = doctorStatus;
  if (active !== undefined) updateData.active = active;

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
