import User from "../models/userModel.js";
import FamilyMember from "../models/familyMemberModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

// 1. Get Current User Profile (with formatted dates)
export const getMe = catchAsync(async (req, res, next) => {
  // We assume req.user is set (even if auth is commented out, normally it would be there)
  // For testing without auth, you might need to hardcode an ID if protect is off
  // But usually, we uncomment protect before testing this.
  
  // If protect is commented out in routes, req.user will be undefined.
  // For safety, let's check:
  if (!req.user) {
    // If testing without Auth, fetch a specific user or return error
    // For now, let's assume you will uncomment 'protect' soon.
    // Or simpler: just return a placeholder if no user found
    return next(new AppError('You are not logged in (req.user is undefined)', 401));
  }

  const user = await User.findById(req.user.id);

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

// 2. Update User Profile
export const updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }

  // 2) Filtered out unwanted field names that are not allowed to be updated
  const allowedFields = [
    'name', 'phone', 'gender', 'dateOfBirth', 
    'specialization', 'experienceYears', 'about', 'hospitalName',
    'location', 'address' // Allow updating location/address
  ];
  
  const filteredBody = {};
  Object.keys(req.body).forEach(el => {
    if (allowedFields.includes(el)) filteredBody[el] = req.body[el];
  });

  // 3) Handle Image Upload (Cloudinary)
  if (req.file && req.file.path) {
    filteredBody.avatarUrl = req.file.path;
  }

  // 4) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: { user: updatedUser }
  });
});

// --- FAMILY MEMBER LOGIC ---

// 3. Send Family Request (User A invites User B)
export const sendFamilyRequest = catchAsync(async (req, res, next) => {
  const { email, phone, relationship } = req.body;

  // 1. Find the user they want to add
  // We search by email OR phone
  let targetUser;
  if (email) targetUser = await User.findOne({ email });
  else if (phone) targetUser = await User.findOne({ phone });

  if (!targetUser) {
    return next(new AppError('No user found with that email or phone number.', 404));
  }

  if (targetUser.id === req.user.id) {
    return next(new AppError('You cannot add yourself as a family member.', 400));
  }

  // 2. Check if a connection already exists (pending or accepted)
  const existingConnection = await FamilyMember.findOne({
    requester: req.user.id,
    recipient: targetUser.id
  });

  if (existingConnection) {
    return next(new AppError('You have already sent a request to this user.', 400));
  }

  // 3. Create the request (Status: pending)
  const newMember = await FamilyMember.create({
    requester: req.user.id,
    recipient: targetUser.id,
    relationship: relationship || 'Family',
    status: 'pending'
  });

  res.status(201).json({
    status: 'success',
    message: 'Family request sent successfully',
    data: { request: newMember }
  });
});

// 4. Respond to Request (User B accepts/rejects)
export const respondToFamilyRequest = catchAsync(async (req, res, next) => {
  const { requestId } = req.params;
  const { status } = req.body; // 'accepted' or 'rejected'

  if (!['accepted', 'rejected'].includes(status)) {
    return next(new AppError('Status must be accepted or rejected', 400));
  }

  const connection = await FamilyMember.findById(requestId);

  if (!connection) {
    return next(new AppError('Request not found', 404));
  }

  // Ensure the logged-in user is actually the RECIPIENT
  if (connection.recipient.toString() !== req.user.id) {
    return next(new AppError('This request was not sent to you', 403));
  }

  connection.status = status;
  await connection.save();

  res.status(200).json({
    status: 'success',
    data: { connection }
  });
});

// 5. Get My Accepted Family Members
export const getMyFamilyMembers = catchAsync(async (req, res, next) => {
  // Logic: Find entries where I am the requester OR recipient, AND status is accepted
  const connections = await FamilyMember.find({
    $or: [{ requester: req.user.id }, { recipient: req.user.id }],
    status: 'accepted'
  })
    .populate('requester', 'name avatarUrl phone')
    .populate('recipient', 'name avatarUrl phone');

  // Format the data so frontend gets a clean list of "The Other Person"
  const familyList = connections.map(conn => {
    const isRequester = conn.requester._id.toString() === req.user.id;
    return {
      _id: conn._id,
      memberInfo: isRequester ? conn.recipient : conn.requester,
      relationship: conn.relationship, // Note: this relationship string is from Requester's perspective
      status: conn.status
    };
  });

  res.status(200).json({
    status: 'success',
    results: familyList.length,
    data: { familyMembers: familyList }
  });
});

// 6. Get Pending Requests (Incoming)
export const getReceivedFamilyRequests = catchAsync(async (req, res, next) => {
  const requests = await FamilyMember.find({
    recipient: req.user.id,
    status: 'pending'
  }).populate('requester', 'name avatarUrl email');

  res.status(200).json({
    status: 'success',
    results: requests.length,
    data: { requests }
  });
});

// 7. Remove Family Member
export const deleteFamilyMember = catchAsync(async (req, res, next) => {
  const connection = await FamilyMember.findById(req.params.id);

  if (!connection) {
    return next(new AppError('Connection not found', 404));
  }

  // Allow delete if user is either requester or recipient
  if (
    connection.requester.toString() !== req.user.id &&
    connection.recipient.toString() !== req.user.id
  ) {
    return next(new AppError('You are not authorized to delete this.', 403));
  }

  await FamilyMember.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});
