import express from "express";
import {
  createMedicinePlan,
  getMyMedicinePlans,
  getTodayPlans,
  getTodayTimeline,
  getFamilyMemberTodayTimeline,
  updateMedicinePlan,
  deleteMedicinePlan,
  recordMedicineAction,
} from "../controllers/medicineController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("patient"));

router.route("/")
  .post(createMedicinePlan)
  .get(getMyMedicinePlans);

router.get("/today", getTodayPlans);
router.get("/today/timeline", getTodayTimeline);
router.get("/family/:familyMemberId/today", getFamilyMemberTodayTimeline);

router.post("/:id/logs", recordMedicineAction);

router.route("/:id")
  .patch(updateMedicinePlan)
  .delete(deleteMedicinePlan);

export default router;
