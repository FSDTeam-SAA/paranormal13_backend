import Order from "../models/orderModel.js";
import Pharmacy from "../models/pharmacyModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { sendResponse } from "../utils/responseHandler.js";
import { sendNotification } from "./notificationController.js";

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

  // --- NOTIFICATION TRIGGER ---
  // Find the pharmacy to get the owner's ID
  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (pharmacy && pharmacy.owner) {
    await sendNotification(
        req.app.get("io"),
        pharmacy.owner, // Notify the pharmacist
        "order",
        "New Order Received",
        `You have a new order from ${req.user.name}`,
        order._id
    );
  }

  sendResponse(res, 201, "Order placed successfully", { order });
});

// 2. Get My Orders (Patient History)
export const getMyOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ patient: req.user.id })
    .populate("pharmacy", "name address phone")
    .sort("-createdAt");

  sendResponse(res, 200, "Orders retrieved successfully", { orders });
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

  // Filter out orders that don't belong to this user's pharmacy
  const myOrders = orders.filter((order) => order.pharmacy !== null);

  sendResponse(res, 200, "Pharmacy orders retrieved successfully", {
    orders: myOrders,
  });
});

// 4. Update Order Status
export const updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).populate("patient", "name"); // Populate to get patient ID for notification

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  // --- NOTIFICATION TRIGGER (Optional but recommended) ---
  // Notify Patient about status change
  await sendNotification(
    req.app.get("io"),
    order.patient._id,
    "order",
    `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`, // e.g. "Order Delivered"
    `Your order status has been updated to: ${status}`,
    order._id
  );

  sendResponse(res, 200, "Order status updated successfully", { order });
});

// 5. Get Pharmacist Dashboard
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

  sendResponse(res, 200, "Dashboard data retrieved successfully", {
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
  });
});