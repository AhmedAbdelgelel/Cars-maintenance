const Car = require("../models/carsModel");
const Driver = require("../models/driverModel");
const Maintenance = require("../models/maintenanceModel");
const ApiError = require("../utils/apiError");
const asyncHandler = require("express-async-handler");
const ApiFeatures = require("../utils/apiFeatures");

exports.getMeterReadings = asyncHandler(async (req, res) => {
  const cars = await Car.find().select(
    "plateNumber brand model meterReadingsHistory"
  );
  const result = cars.map((car) => ({
    plateNumber: car.plateNumber,
    brand: car.brand,
    model: car.model,
    readings: car.meterReadingsHistory,
  }));
  res.status(200).json({
    status: "success",
    data: result,
  });
});

exports.getAllCars = asyncHandler(async (req, res) => {
  const apiFeatures = new ApiFeatures(Car.find(), req.query, [
    "plateNumber",
    "brand",
    "model",
  ]).search();
  const cars = await apiFeatures.query
    .select("-__v")
    .populate({
      path: "driver",
      select: "_id name phoneNumber nationalId licenseNumber",
    })
    .populate({
      path: "maintenanceHistory",
      select:
        "_id car driver subCategories description cost mechanicCost date createdAt updatedAt",
      populate: [
        {
          path: "subCategories",
          select: "_id name description category",
          populate: {
            path: "category",
            select: "_id name",
          },
        },
        {
          path: "driver",
          select: "_id name phoneNumber nationalId licenseNumber",
        },
      ],
    });

  // Add oilChangeKM to each car
  const carsWithOilChange = cars.map((car) => ({
    ...car.toObject(),
    oilChangeKM: car.meterReading - car.lastOCRCheck,
  }));
  res.status(200).json({
    status: "success",
    results: carsWithOilChange.length,
    data: carsWithOilChange,
  });
});

exports.getTotalCarsNumber = asyncHandler(async (req, res) => {
  const totalCars = await Car.countDocuments();
  res.status(200).json({
    status: "success",
    totalCars,
  });
});

exports.getCarById = asyncHandler(async (req, res, next) => {
  const car = await Car.findById(req.params.id)
    .select("-__v")
    .populate({
      path: "driver",
      select: "_id name phoneNumber nationalId licenseNumber",
    })
    .populate({
      path: "maintenanceHistory",
      select:
        "_id car driver subCategories description cost mechanicCost date createdAt updatedAt",
      populate: [
        {
          path: "subCategories",
          select: "_id name description category",
          populate: {
            path: "category",
            select: "_id name",
          },
        },
        {
          path: "driver",
          select: "_id name phoneNumber nationalId licenseNumber",
        },
      ],
    });

  if (!car) {
    return next(
      new ApiError(`No car found with this id: ${req.params.id}`, 404)
    );
  }

  // Add oilChangeKM to car response
  const carObj = car.toObject();
  carObj.oilChangeKM = carObj.meterReading - carObj.lastOCRCheck;
  res.status(200).json({
    status: "success",
    data: carObj,
  });
});

exports.createCar = asyncHandler(async (req, res, next) => {
  // Only admin can create cars
  if (req.user.role !== "admin") {
    return next(new ApiError("Only admin can add cars", 403));
  }
  const existingCar = await Car.findOne({ plateNumber: req.body.plateNumber });
  if (existingCar) {
    return next(
      new ApiError(
        `Car with this plate number already exists: ${req.body.plateNumber}`,
        400
      )
    );
  }
  const car = await Car.create(req.body);
  if (req.body.driver) {
    await Promise.all([
      Driver.findByIdAndUpdate(req.body.driver, { car: car._id }),
      Car.findByIdAndUpdate(car._id, { driver: req.body.driver }),
    ]);
  }
  res.status(201).json({
    status: "success",
    message: "Car created successfully",
    data: car,
  });
});

exports.updateCar = asyncHandler(async (req, res, next) => {
  try {
    // Only admin can change car status
    if (req.body.status && req.user.role !== "admin") {
      return next(
        new ApiError("Only administrators can change car status", 403)
      );
    }

    const car = await Car.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
      .select("-__v")
      .populate({
        path: "driver",
        select: "_id name phoneNumber nationalId licenseNumber",
      })
      .populate({
        path: "maintenanceHistory",
        select:
          "_id car driver subCategories description cost mechanicCost date createdAt updatedAt",
        populate: [
          {
            path: "subCategories",
            select: "_id name description category",
            populate: {
              path: "category",
              select: "_id name",
            },
          },
          {
            path: "driver",
            select: "_id name phoneNumber nationalId licenseNumber",
          },
        ],
      });

    if (!car) {
      return next(new ApiError("No car found with this id", 404));
    }

    if (req.body.driver) {
      await Promise.all([
        Driver.updateMany(
          { car: car._id, _id: { $nin: req.body.driver } },
          { car: null }
        ),
        Driver.updateMany({ _id: { $in: req.body.driver } }, { car: car._id }),
      ]);
    }

    res.status(200).json({
      status: "success",
      message: "Car updated successfully",
      data: car,
    });
  } catch (error) {
    next(error);
  }
});

exports.deleteCar = asyncHandler(async (req, res, next) => {
  // Only admin can delete cars
  if (req.user.role !== "admin") {
    return next(new ApiError("Only admin can delete cars", 403));
  }
  const car = await Car.findById(req.params.id);
  if (!car) {
    return next(
      new ApiError(`No car found with this id: ${req.params.id}`, 404)
    );
  }
  await Promise.all([
    Maintenance.deleteMany({ car: req.params.id }),
    Car.findByIdAndDelete(req.params.id),
  ]);
  res.status(200).json({
    status: "success",
    message: "Car deleted successfully",
  });
});
