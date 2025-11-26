import express from "express";
import {
  getMe,
  updateMe,
  sendFamilyRequest,
  respondToFamilyRequest,
  getMyFamilyMembers,
  getReceivedFamilyRequests,
  deleteFamilyMember,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { uploadSingleImage } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.use(protect);

// USER PROFILE
router.get("/me", getMe);
router.patch("/me", uploadSingleImage("avatar"), updateMe);

// FAMILY CONNECTION
router.post("/family/request", sendFamilyRequest);

// Accept or Reject a request
router.patch("/family/request/:requestId", respondToFamilyRequest);

// 3. Get list of accepted Family Members
router.get("/family", getMyFamilyMembers);

// 4. Get list of Pending Requests (Incoming)
router.get("/family/requests/received", getReceivedFamilyRequests);

// 5. Remove a family member connection
router.delete("/family/:id", deleteFamilyMember);

export default router;
