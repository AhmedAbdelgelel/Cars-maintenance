const express = require("express");
const router = express.Router();
const {
  getAllCars,
  getCarById,
  createCar,
  updateCar,
  deleteCar,
  getTotalCarsNumber,
  getMeterReadings,
} = require("../services/carsService");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

router
  .route("/total")
  .get(protect, restrictTo("admin", "accountant"), getTotalCarsNumber);

// Endpoint to get meter readings by date range
router.get(
  "/meter-readings",
  protect,
  restrictTo("admin", "accountant"),
  getMeterReadings
);

router
  .route("/")
  .get(protect, restrictTo("admin", "accountant"), getAllCars)
  .post(protect, restrictTo("admin"), createCar);

router
  .route("/:id")
  .get(protect, restrictTo("admin", "accountant"), getCarById)
  .put(protect, restrictTo("admin", "accountant"), updateCar)
  .delete(protect, restrictTo("admin"), deleteCar);



module.exports = router;
