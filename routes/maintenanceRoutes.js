const express = require("express");
const router = express.Router();
const {
  getAllMaintenanceRecords,
  getMaintenanceById,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
} = require("../services/maintenanceService");

router.route("/").get(getAllMaintenanceRecords).post(createMaintenanceRecord);

router
  .route("/:id")
  .get(getMaintenanceById)
  .put(updateMaintenanceRecord)
  .delete(deleteMaintenanceRecord);

module.exports = router;
