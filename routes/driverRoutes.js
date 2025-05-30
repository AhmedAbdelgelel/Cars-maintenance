const express = require("express");
const router = express.Router();
const {
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
  getDriverByPhoneNumber,
  getDriverMaintenanceRecords,
  getDriverMe,
  searchDrivers,
  getTotalDrivers,
  createDriver,
} = require("../services/driverService");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

router.post("/create-driver", protect, restrictTo("admin"), createDriver);

router.get("/me", protect, restrictTo("driver"), getDriverMe);

router.route("/").get(protect, restrictTo("admin"), getAllDrivers);

router.route("/search").get(protect, restrictTo("admin"), searchDrivers);

router.route("/total").get(protect, restrictTo("admin"), getTotalDrivers);

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
