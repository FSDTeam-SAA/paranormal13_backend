const User = require('../models/userModel');
const Order = require('../models/orderModel');
const catchAsync = require('../utils/catchAsync');

exports.getDashboardStats = catchAsync(async (req, res, next) => {
  const totalUsers = await User.countDocuments({ role: 'patient' });
  const totalDoctors = await User.countDocuments({ role: 'doctor' });
  const totalPharmacists = await User.countDocuments({ role: 'pharmacist' });

  const recentOrders = await Order.find()
    .sort('-createdAt')
    .limit(20)
    .select('createdAt status');

  res.status(200).json({
    status: 'success',
    data: {
      totalUsers,
      totalDoctors,
      totalPharmacists,
      recentOrders
    }
  });
});

exports.getUsersByRole = catchAsync(async (req, res, next) => {
  const { role = 'patient', page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const users = await User.find({ role })
    .skip(skip)
    .limit(parseInt(limit, 10))
    .sort('-createdAt');

  const total = await User.countDocuments({ role });

  res.status(200).json({
    status: 'success',
    results: users.length,
    total,
    data: { users }
  });
});

exports.updateUserStatus = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { active: req.body.active },
    { new: true }
  );

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});
