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

router
  .route("/")
  .get(protect, restrictTo("admin", "accountant"), getAllDrivers);

router
  .route("/total")
  .get(protect, restrictTo("admin", "accountant"), getTotalDrivers);

router
  .route("/:id")
  .get(protect, restrictTo("admin", "accountant"), getDriverById)
  .put(protect, restrictTo("admin", "accountant"), updateDriver)
  .delete(protect, restrictTo("admin"), deleteDriver);

router
  .route("/phone/:phoneNumber")
  .get(protect, restrictTo("admin", "accountant"), getDriverByPhoneNumber);

router
  .route("/:id/maintenance")
  .get(
    protect,
    restrictTo("admin", "driver", "accountant"),
    getDriverMaintenanceRecords
  );

module.exports = router;
