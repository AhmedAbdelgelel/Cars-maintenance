const express = require("express");
const router = express.Router();
const {
  getAllCars,
  getCarById,
  createCar,
  updateCar,
  deleteCar,
  getTotalCarsNumber,
} = require("../services/carsService");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

router.route("/total").get(protect, restrictTo("admin"), getTotalCarsNumber);

router
  .route("/")
  .get(protect, restrictTo("admin"), getAllCars)
  .post(protect, restrictTo("admin"), createCar);

router
  .route("/:id")
  .get(protect, restrictTo("admin"), getCarById)
  .put(protect, restrictTo("admin"), updateCar)
  .delete(protect, restrictTo("admin"), deleteCar);

module.exports = router;
