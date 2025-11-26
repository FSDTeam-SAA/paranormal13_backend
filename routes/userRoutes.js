const express = require("express");
const userController = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware"); // Importing Auth Middleware
const { uploadSingleImage } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(protect);

//USER PROFILE
router.get("/me", userController.getMe);
router.patch("/me", uploadSingleImage("avatar"), userController.updateMe);

//FAMILY CONNECTION
router.post("/family/request", userController.sendFamilyRequest);

// Accept or Reject a request
router.patch(
  "/family/request/:requestId",
  userController.respondToFamilyRequest
);

// 3. Get list of accepted Family Members
router.get("/family", userController.getMyFamilyMembers);

// 4. Get list of Pending Requests (Incoming)
router.get(
  "/family/requests/received",
  userController.getReceivedFamilyRequests
);

// 5. Remove a family member connection
router.delete("/family/:id", userController.deleteFamilyMember);

module.exports = router;
