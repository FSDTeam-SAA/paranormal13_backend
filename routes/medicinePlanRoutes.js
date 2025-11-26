import express from "express";
import * as medicinePlanController from "../controllers/medicinePlanController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

// My Plans
router
  .route("/")
  .post(medicinePlanController.createMedicinePlan)
  .get(medicinePlanController.getMyMedicinePlans);

// Single Plan Operations
router
  .route("/:id")
  .patch(medicinePlanController.updateMedicinePlan)
  .delete(medicinePlanController.deleteMedicinePlan);

// Family Feature: See relative's meds
router.get("/family/:memberId", medicinePlanController.getFamilyMemberPlans);

export default router;
