const express = require('express');
const orderController = require('../controllers/orderController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// patient
router.post('/', restrictTo('patient'), orderController.createOrder);
router.get('/me', restrictTo('patient'), orderController.getMyOrders);

// pharmacist
router.get(
  '/pharmacy/me',
  restrictTo('pharmacist'),
  orderController.getMyPharmacyOrders
);
router.patch(
  '/:id/status',
  restrictTo('pharmacist'),
  orderController.updateOrderStatus
);

module.exports = router;
