const express = require("express");
const router = express.Router();
const {
  getAllMaintenanceRecords,
  getMaintenanceById,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
  getMaintenanceCostRecords,
} = require("../services/maintenanceService");
const { protect, restrictTo } = require("../middlewares/authMiddleware");
router
  .route("/cost")
  .get(protect, restrictTo("admin", "accountant"), getMaintenanceCostRecords);

router
  .route("/")
  .get(
    protect,
    restrictTo("admin", "accountant", "driver"),
    getAllMaintenanceRecords
  )
  .post(
    protect,
    restrictTo("admin", "accountant", "driver"),
    createMaintenanceRecord
  );

router
  .route("/:id")
  .get(protect, restrictTo("admin", "accountant", "driver"), getMaintenanceById)
  .put(protect, restrictTo("admin", "accountant"), updateMaintenanceRecord)
  .delete(protect, restrictTo("admin", "accountant"), deleteMaintenanceRecord);

module.exports = router;
