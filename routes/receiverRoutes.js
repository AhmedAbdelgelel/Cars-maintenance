const express = require("express");
const router = express.Router();
const {
  getPendingRequests,
  acceptMaintenanceRequest,
  rejectMaintenanceRequest,
  getAcceptedRequests,
  getReceiverMe,
  createReceiver,
  getAllReceivers,
  loginReceiver,
} = require("../services/receiverService");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

// Receiver endpoints
router.get("/me", protect, restrictTo("receiver"), getReceiverMe);
router.get(
  "/pending-requests",
  protect,
  restrictTo("receiver"),
  getPendingRequests
);
router.get(
  "/accepted-requests",
  protect,
  restrictTo("receiver"),
  getAcceptedRequests
);
router.patch(
  "/requests/:requestId/accept",
  protect,
  restrictTo("receiver"),
  acceptMaintenanceRequest
);
router.patch(
  "/requests/:requestId/reject",
  protect,
  restrictTo("receiver"),
  rejectMaintenanceRequest
);
router.post("/login", loginReceiver);

// Admin endpoints for receiver management
router.post("/", protect, restrictTo("admin"), createReceiver);
router.get("/", protect, restrictTo("admin"), getAllReceivers);

module.exports = router;
