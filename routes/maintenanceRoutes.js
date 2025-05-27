const express = require("express");
const router = express.Router();
const {
  getAllMaintenanceRecords,
  getMaintenanceById,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
} = require("../services/maintenanceService");
const { protect, restrictTo } = require("../services/authService");

router.route("/")
  .get(protect, restrictTo("admin"), getAllMaintenanceRecords)
  .post(protect, restrictTo("admin" , "driver"), createMaintenanceRecord);

router
  .route("/:id")
  .get(getMaintenanceById)
  .put(updateMaintenanceRecord)
  .delete(deleteMaintenanceRecord);

module.exports = router;
