const express = require('express');
const medicineController = require('../controllers/medicineController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(restrictTo('patient'));

router
  .route('/')
  .post(medicineController.createMedicinePlan)
  .get(medicineController.getMyMedicinePlans);

router.get('/today', medicineController.getTodayPlans);

router
  .route('/:id')
  .patch(medicineController.updateMedicinePlan)
  .delete(medicineController.deleteMedicinePlan);

module.exports = router;
