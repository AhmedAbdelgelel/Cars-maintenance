const express = require("express");
const router = express.Router();
const {
  getAllMaintenanceRecords,
  getMaintenanceById,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
} = require("../services/maintenanceService");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

router
  .route("/")
  .get(protect, restrictTo("admin"), getAllMaintenanceRecords)

  .post(protect, restrictTo("admin", "driver"), createMaintenanceRecord);

router
  .route("/:id")
  .get(protect, restrictTo("admin", "driver"), getMaintenanceById)
  .put(protect, restrictTo("admin"), updateMaintenanceRecord)
  .delete(protect, restrictTo("admin"), deleteMaintenanceRecord);

module.exports = router;
