const express = require('express');
const pharmacyController = require('../controllers/pharmacyController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// public: list nearby
router.get('/nearby', pharmacyController.getNearbyPharmacies);

// pharmacy owner
router.use(protect, restrictTo('pharmacist'));

router.post('/me', pharmacyController.upsertMyPharmacy);

module.exports = router;
