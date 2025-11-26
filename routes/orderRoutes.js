import express from "express";
import {
  createOrder,
  getMyOrders,
  getMyPharmacyOrders,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

// patient
router.post("/", restrictTo("patient"), createOrder);
router.get("/me", restrictTo("patient"), getMyOrders);

// pharmacist
router.get("/pharmacy/me", restrictTo("pharmacist"), getMyPharmacyOrders);
router.patch("/:id/status", restrictTo("pharmacist"), updateOrderStatus);

export default router;
