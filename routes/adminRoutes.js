const express = require('express');
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.get('/stats', adminController.getDashboardStats);
router.get('/users', adminController.getUsersByRole);
router.patch('/users/:id/status', adminController.updateUserStatus);

module.exports = router;
