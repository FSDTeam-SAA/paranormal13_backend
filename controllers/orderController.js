import Order from "../models/orderModel.js";
import catchAsync from "../utils/catchAsync.js";

// Patient creates order
export const createOrder = catchAsync(async (req, res, next) => {
  const { pharmacyId, medicines, address, lat, lng } = req.body;

  const order = await Order.create({
    patient: req.user.id,
    pharmacy: pharmacyId,
    medicines,
    address,
    location: {
      type: 'Point',
      coordinates: [lng, lat]
    }
  });

  res.status(201).json({
    status: 'success',
    data: { order }
  });
});

// Patient orders
export const getMyOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ patient: req.user.id })
    .populate('pharmacy', 'name address')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: { orders }
  });
});

// Pharmacy orders
export const getMyPharmacyOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find()
    .populate({
      path: 'pharmacy',
      match: { owner: req.user.id }
    })
    .populate('patient', 'name')
    .sort('-createdAt');

  const filtered = orders.filter(order => order.pharmacy);

  res.status(200).json({
    status: 'success',
    results: filtered.length,
    data: { orders: filtered }
  });
});

// Pharmacy updates status
export const updateOrderStatus = catchAsync(async (req, res, next) => {
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );

  res.status(200).json({
    status: 'success',
    data: { order }
  });
});
