const express = require("express");
const router = express.Router();
const {
  getAllDrivers,
  getDriverById,
  registerDriver,
  updateDriver,
  deleteDriver,
  getDriverByPhoneNumber,
  getDriverMaintenanceRecords,
} = require("../services/driverService");

router.route("/").get(getAllDrivers).post(registerDriver);

router.route("/:id").get(getDriverById).put(updateDriver).delete(deleteDriver);

router.route("/phone/:phoneNumber").get(getDriverByPhoneNumber);

router.route("/:id/maintenance").get(getDriverMaintenanceRecords);

module.exports = router;
