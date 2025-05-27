const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");
const { protect } = require("../middlewares/authMiddleware");
const {
  analyzeMeterImage,
  updateDriverMeterReading,
} = require("../services/carMeterService");

router.post(
  "/analyze",
  protect,
  upload.single("meterImage"),
  analyzeMeterImage
);

router.post("/update-driver-reading", protect, updateDriverMeterReading);

module.exports = router;
