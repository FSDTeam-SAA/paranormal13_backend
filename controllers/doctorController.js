const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// 1. Get All Doctors (Search & Filter)
exports.getDoctors = catchAsync(async (req, res, next) => {
  const { search, specialization } = req.query;

  // Base Query: Must be a Doctor AND must be Approved
  const queryObj = { 
    role: 'doctor',
    doctorStatus: 'approved' 
  };

  // Add Specialization Filter
  if (specialization) {
    queryObj.specialization = { $regex: specialization, $options: 'i' };
  }

  // Add Search Logic (Name OR Hospital OR Specialization)
  if (search) {
    queryObj.$or = [
      { name: { $regex: search, $options: 'i' } },
      { hospitalName: { $regex: search, $options: 'i' } },
      { specialization: { $regex: search, $options: 'i' } }
    ];
  }

  // Fetch doctors but strictly limit the fields returned
  const doctors = await User.find(queryObj)
    .select('name specialization hospitalName avatarUrl experienceYears location doctorStatus rating');

  res.status(200).json({
    status: 'success',
    results: doctors.length,
    data: { doctors }
  });
});

// 2. Get Single Doctor Profile
exports.getDoctor = catchAsync(async (req, res, next) => {
  const doctor = await User.findOne({ 
    _id: req.params.id, 
    role: 'doctor',
    doctorStatus: 'approved' 
  }).select('-password -active -passwordChangedAt -__v');

  if (!doctor) {
    return next(new AppError('No approved doctor found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { doctor }
  });
});