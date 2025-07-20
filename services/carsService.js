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

  // Add needsOilChange to each car
  const carsWithOilChange = cars.map((car) => {
    const carObj = car.toObject();
    carObj.needsOilChange = (carObj.oilChangeReminderPoint > 0) && (carObj.meterReading >= carObj.oilChangeReminderPoint);
    return carObj;
  });
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

  // Add needsOilChange to car
  const carObj = car.toObject();
  carObj.needsOilChange = (carObj.oilChangeReminderPoint > 0) && (carObj.meterReading >= carObj.oilChangeReminderPoint);
  res.status(200).json({
    status: "success",
    data: carObj,
  });
});

exports.createCar = asyncHandler(async (req, res, next) => {
  // Only admin can create cars
  const role = req.user?.role || req.accountant?.role;
  if (role !== "admin") {
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
    // Set status to 'in_use' if driver(s) assigned
    await Car.findByIdAndUpdate(car._id, { status: 'in_use' });
  } else {
    // Set status to 'available' if no driver
    await Car.findByIdAndUpdate(car._id, { status: 'available' });
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
    const role = req.user?.role || req.accountant?.role;
    if (req.body.status && role !== "admin") {
      return next(
        new ApiError("Only administrators can change car status", 403)
      );
    }

    // If admin is setting oil change reminder, calculate and store the reminder point
    if (req.body.oilChangeReminderKM && req.body.oilChangeReminderKM > 0) {
      const currentCar = await Car.findById(req.params.id);
      const meterReadingToUse = typeof req.body.meterReading !== 'undefined'
        ? Number(req.body.meterReading)
        : Number(currentCar.meterReading);
      req.body.oilChangeReminderPoint = meterReadingToUse + Number(req.body.oilChangeReminderKM);
    }

    let meterReadingWasUpdated = false;
    let shouldPushHistory = false;
    let historyReading = null;
    if (typeof req.body.oilChangeReminderKM !== 'undefined') {
      req.body.ocrShouldSetBase = true;
    }
    if (typeof req.body.meterReading !== 'undefined') {
      const currentCar = await Car.findById(req.params.id);
      if (!currentCar.meterReading || currentCar.meterReading === 0) {
        // First reading: set meterReading, oilChangeReminderPoint, and lastOCRCheck
        req.body.meterReading = Number(req.body.meterReading);
        req.body.lastOCRCheck = req.body.meterReading;
        req.body.lastUpdateSource = 'admin';
        meterReadingWasUpdated = true;
        if (req.body.oilChangeReminderKM && req.body.oilChangeReminderKM > 0) {
          req.body.oilChangeReminderPoint = Number(req.body.meterReading) + Number(req.body.oilChangeReminderKM);
        } else {
          req.body.oilChangeReminderPoint = Number(req.body.meterReading) + Number(currentCar.oilChangeReminderKM || 0);
        }
      } else {
        // Subsequent readings: only update lastOCRCheck and meterReadingsHistory
        req.body.lastOCRCheck = Number(req.body.meterReading);
        req.body.$push = req.body.$push || {};
        req.body.$push.meterReadingsHistory = {
          reading: req.body.meterReading,
          date: new Date(),
        };
        // Do NOT update meterReading or oilChangeReminderPoint
        delete req.body.meterReading;
        delete req.body.oilChangeReminderPoint;
      }
    }

    // Main update
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

    // Push to meterReadingsHistory if needed
    if (shouldPushHistory && historyReading !== null) {
      await Car.findByIdAndUpdate(req.params.id, {
        $push: { meterReadingsHistory: { reading: historyReading, date: new Date() } }
      });
    }

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
      // Set status to 'in_use' if driver(s) assigned
      await Car.findByIdAndUpdate(car._id, { status: 'in_use' });
    } else if (req.body.driver === null || (Array.isArray(req.body.driver) && req.body.driver.length === 0)) {
      // Set status to 'available' if no driver
      await Car.findByIdAndUpdate(car._id, { status: 'available' });
    }

    res.status(200).json({
      status: "success",
      message: "Car updated successfully",
      data: car,
      meterReadingWasUpdated,
      lastOCRCheck: car.lastOCRCheck,
      oilChangeReminderPoint: car.oilChangeReminderPoint,
      meterReading: car.meterReading
    });
  } catch (error) {
    next(error);
  }
});

exports.deleteCar = asyncHandler(async (req, res, next) => {
  // Only admin can delete cars
  const role = req.user?.role || req.accountant?.role;
  if (role !== "admin") {
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
