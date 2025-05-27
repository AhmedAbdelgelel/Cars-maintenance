const express = require("express");
const router = express.Router();
const {
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
  getDriverByPhoneNumber,
  getDriverMaintenanceRecords,
} = require("../services/driverService");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

router.route("/").get(protect, restrictTo("admin"), getAllDrivers);

router
  .route("/:id")
  .get(protect, restrictTo("admin"), getDriverById)
  .put(protect, restrictTo("admin"), updateDriver)
  .delete(protect, restrictTo("admin"), deleteDriver);

router
  .route("/phone/:phoneNumber")
  .get(protect, restrictTo("admin"), getDriverByPhoneNumber);

router
  .route("/:id/maintenance")
  .get(protect, restrictTo("admin", "driver"), getDriverMaintenanceRecords);

module.exports = router;
