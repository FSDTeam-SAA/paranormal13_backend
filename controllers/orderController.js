import Order from "../models/orderModel.js";
import Pharmacy from "../models/pharmacyModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { pushNotification } from "../utils/notificationService.js";
import { ensureConversation } from "../utils/chatService.js";

// Patient creates order
export const createOrder = catchAsync(async (req, res, next) => {
  const { pharmacyId, medicines, address, lat, lng } = req.body;

  if (!Array.isArray(medicines) || medicines.length === 0) {
    return next(new AppError("Please add at least one medicine.", 400));
  }

  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy) {
    return next(new AppError("Pharmacy not found.", 404));
  }

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
    return next(
      new AppError("Please provide valid latitude and longitude values.", 400)
    );
  }

  const order = await Order.create({
    patient: req.user.id,
    pharmacy: pharmacyId,
    medicines,
    address,
    location: {
      type: "Point",
      coordinates: [lngNum, latNum],
    },
  });

  const customerName = req.user?.name || "A patient";
  await pushNotification({
    recipient: pharmacy.owner,
    sender: req.user.id,
    type: "order",
    title: "New medicine order",
    message: `${customerName} placed a new order with ${medicines.length} item(s).`,
    meta: { orderId: order._id, pharmacyId },
  });

  await pushNotification({
    recipient: req.user.id,
    sender: pharmacy.owner,
    type: "order",
    title: "Order placed",
    message: `We notified ${pharmacy.name} about your order.`,
    meta: { orderId: order._id, pharmacyId },
  });

  await ensureConversation({
    participants: [req.user.id, pharmacy.owner],
    topicType: "order",
    contextId: order._id,
    createdBy: req.user.id,
  });

  res.status(201).json({
    status: "success",
    data: { order },
  });
});

// Patient orders
export const getMyOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ patient: req.user.id })
    .populate("pharmacy", "name address")
    .sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: { orders },
  });
});

// Pharmacy orders
export const getMyPharmacyOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find()
    .populate({
      path: "pharmacy",
      match: { owner: req.user.id },
    })
    .populate("patient", "name")
    .sort("-createdAt");

  const filtered = orders.filter((order) => order.pharmacy);

  res.status(200).json({
    status: "success",
    results: filtered.length,
    data: { orders: filtered },
  });
});

// Pharmacy updates status
export const updateOrderStatus = catchAsync(async (req, res, next) => {
  const allowedStatuses = [
    "pending",
    "accepted",
    "delivering",
    "delivered",
    "cancelled",
  ];

  if (!allowedStatuses.includes(req.body.status)) {
    return next(new AppError("Invalid order status.", 400));
  }

  const order = await Order.findById(req.params.id).populate(
    "pharmacy",
    "owner name"
  );

  if (!order) {
    return next(new AppError("Order not found.", 404));
  }

  if (!order.pharmacy || order.pharmacy.owner.toString() !== req.user.id) {
    return next(
      new AppError("You cannot update orders for another pharmacy.", 403)
    );
  }

  order.status = req.body.status;
  await order.save();

  await pushNotification({
    recipient: order.patient,
    sender: req.user.id,
    type: "order",
    title: `Order ${order.status}`,
    message: `Your order status is now ${order.status}.`,
    meta: { orderId: order._id },
  });

  res.status(200).json({
    status: "success",
    data: { order },
  });
});
