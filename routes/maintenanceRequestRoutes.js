const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");
const {
  createMaintenanceRequest,
  getMaintenanceRequests,
  getMyMaintenanceRequests,
  uploadReceipt,
  getAllMaintenanceRequests,
  completeMaintenanceRequest,
  getMaintenanceRequestById,
  getUnderReviewMaintenanceRequests, // <-- add new endpoint
} = require("../services/maintenanceRequestService");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

// Driver endpoints
router.post("/", protect, restrictTo("driver"), createMaintenanceRequest);
router.get("/my", protect, restrictTo("driver"), getMyMaintenanceRequests);
router.patch(
  "/:requestId/upload-receipt",
  protect,
  restrictTo("driver"),
  upload.single("receiptImage"),
  uploadReceipt
);

// Driver and Admin endpoints
router.get("/", protect, restrictTo("admin", "driver", "accountant"), getMaintenanceRequests);
router.patch(
  "/:requestId/complete",
  protect,
  restrictTo("admin"),
  completeMaintenanceRequest
);

// Admin and Accountant endpoint to get under review requests
router.get(
  "/under-review",
  protect,
  restrictTo("admin", "accountant"),
  getUnderReviewMaintenanceRequests
);

// General endpoints
router.get(
  "/:id",
  protect,
  restrictTo("admin", "driver", "receiver", "accountant"),
  getMaintenanceRequestById
);

module.exports = router;
