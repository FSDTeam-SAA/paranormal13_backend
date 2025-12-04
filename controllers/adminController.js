import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { sendResponse } from "../utils/responseHandler.js";

// 1. Get Dashboard Stats
export const getDashboardStats = catchAsync(async (req, res, next) => {
  const [totalPatients, totalDoctors, totalPharmacists, recentOrders] =
    await Promise.all([
      User.countDocuments({ role: "patient" }),
      User.countDocuments({ role: "doctor" }),
      User.countDocuments({ role: "pharmacist" }),
      Order.find().sort("-createdAt").limit(5).populate("patient", "name"),
    ]);

  const salesStats = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
        },
        status: "delivered",
      },
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const months = [
    "", "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const formattedSales = salesStats.map((item) => ({
    month: months[item._id],
    orders: item.count,
  }));

  sendResponse(res, 200, "Admin stats retrieved successfully", {
    stats: {
      totalPatients,
      totalDoctors,
      totalPharmacists,
    },
    salesReport: formattedSales,
    recentOrders,
  });
});

// 2. Get Users by Role
export const getUsersByRole = catchAsync(async (req, res, next) => {
  const { role } = req.query;
  const filter = role ? { role } : { role: "patient" };

  const users = await User.find(filter)
    .select("name email phone role doctorStatus active avatarUrl createdAt")
    .sort("-createdAt");

  sendResponse(res, 200, "Users retrieved successfully", { users });
});

// 3. Update User Status
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

  sendResponse(res, 200, "User status updated successfully", { user });
});