import Order from "../models/orderModel.js";
import Pharmacy from "../models/pharmacyModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

// 1. Create Order (Patient)
export const createOrder = catchAsync(async (req, res, next) => {
  const { pharmacyId, medicines, address, lat, lng } = req.body;

  if (!lat || !lng) {
    return next(
      new AppError("Delivery location coordinates are required", 400)
    );
  }

  const order = await Order.create({
    patient: req.user.id,
    pharmacy: pharmacyId,
    medicines,
    address,
    location: {
      type: "Point",
      coordinates: [lng, lat],
    },
    status: "pending",
  });

  res.status(201).json({
    status: "success",
    data: { order },
  });
});

// 2. Get My Orders (Patient History)
export const getMyOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ patient: req.user.id })
    .populate("pharmacy", "name address phone")
    .sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: { orders },
  });
});

// 3. Get My Pharmacy's Orders (List)
export const getMyPharmacyOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find()
    .populate({
      path: "pharmacy",
      match: { owner: req.user.id },
      select: "name owner",
    })
    .populate("patient", "name phone avatarUrl")
    .sort("-createdAt");

  const myOrders = orders.filter((order) => order.pharmacy !== null);

  res.status(200).json({
    status: "success",
    results: myOrders.length,
    data: { orders: myOrders },
  });
});

// 4. Update Order Status
export const updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: { order },
  });
});

// 5. Get Pharmacist Dashboard (Stats & Lists)
export const getPharmacistDashboard = catchAsync(async (req, res, next) => {
  const pharmacy = await Pharmacy.findOne({ owner: req.user.id });

  if (!pharmacy) {
    return next(new AppError("You do not have a pharmacy set up yet.", 404));
  }

  const totalOrders = await Order.countDocuments({ pharmacy: pharmacy._id });
  const deliveredOrdersCount = await Order.countDocuments({
    pharmacy: pharmacy._id,
    status: "delivered",
  });

  const recentOrders = await Order.find({
    pharmacy: pharmacy._id,
    status: { $nin: ["delivered", "cancelled"] },
  })
    .populate("patient", "name avatarUrl")
    .sort("-createdAt");

  const deliveredOrders = await Order.find({
    pharmacy: pharmacy._id,
    status: "delivered",
  })
    .populate("patient", "name avatarUrl")
    .sort("-updatedAt");

  res.status(200).json({
    status: "success",
    data: {
      pharmacyName: pharmacy.name,
      pharmacistName: req.user.name,
      stats: {
        total: totalOrders,
        delivered: deliveredOrdersCount,
      },
      lists: {
        recent: recentOrders,
        delivered: deliveredOrders,
      },
    },
  });
});
