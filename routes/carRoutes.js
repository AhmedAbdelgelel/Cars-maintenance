const express = require("express");
const router = express.Router();
const {
  getAllCars,
  getCarById,
  createCar,
  updateCar,
  deleteCar,
} = require("../services/carsService");

router.route("/").get(getAllCars).post(createCar);
router.route("/:id").get(getCarById).put(updateCar).delete(deleteCar);

module.exports = router;
