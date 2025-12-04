import express from "express";
import * as orderController from "../controllers/orderController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

// --- PATIENT ROUTES ---
router.post("/", restrictTo("patient"), orderController.createOrder);
router.get("/me", restrictTo("patient"), orderController.getMyOrders);

// --- PHARMACIST ROUTES ---
router.get(
  "/pharmacy/me",
  restrictTo("pharmacist"),
  orderController.getMyPharmacyOrders
);

router.get(
  "/pharmacy/dashboard",
  restrictTo("pharmacist"),
  orderController.getPharmacistDashboard
);

router.patch(
  "/:id/status",
  restrictTo("pharmacist"),
  orderController.updateOrderStatus
);

export default router;