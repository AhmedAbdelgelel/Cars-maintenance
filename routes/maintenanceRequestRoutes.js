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
router.get("/", protect, restrictTo("admin", "driver"), getMaintenanceRequests);
router.patch(
  "/:requestId/complete",
  protect,
  restrictTo("admin"),
  completeMaintenanceRequest
);

// General endpoints
router.get(
  "/:id",
  protect,
  restrictTo("admin", "driver", "receiver"),
  getMaintenanceRequestById
);

module.exports = router;
