import express from "express";
import {
  createMedicinePlan,
  getMyMedicinePlans,
  getTodayPlans,
  updateMedicinePlan,
  deleteMedicinePlan,
} from "../controllers/medicineController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("patient"));

router.route("/")
  .post(createMedicinePlan)
  .get(getMyMedicinePlans);

router.get("/today", getTodayPlans);

router.route("/:id")
  .patch(updateMedicinePlan)
  .delete(deleteMedicinePlan);

export default router;