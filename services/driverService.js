const Driver = require("../models/driverModel");
const Car = require("../models/carsModel");
const Maintenance = require("../models/maintenanceModel");
const ApiError = require("../utils/apiError");

exports.getAllDrivers = async (req, res) => {
  const drivers = await Driver.find().populate({
    path: "car",
    select: "brand model plateNumber year color status",
  });

  res.status(200).json({
    status: "success",
    results: drivers.length,
    data: drivers,
  });
};

exports.getDriverById = async (req, res, next) => {
  const driver = await Driver.findById(req.params.id).populate({
    path: "car",
    select: "brand model plateNumber year color status",
  });

  if (!driver) {
    return next(
      new ApiError(`No driver found with this id: ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    status: "success",
    data: driver,
  });
};

exports.getDriverByPhoneNumber = async (req, res, next) => {
  const driver = await Driver.findOne({
    phoneNumber: req.params.phoneNumber,
  }).populate({
    path: "car",
    select: "brand model plateNumber year color status",
  });

  if (!driver) {
    return next(
      new ApiError(
        `No driver found with this phone number: ${req.params.phoneNumber}`,
        404
      )
    );
  }

  res.status(200).json({
    status: "success",
    data: driver,
  });
};

exports.updateDriver = async (req, res, next) => {
  if (req.body.phoneNumber) {
    const existingDriver = await Driver.findOne({
      phoneNumber: req.body.phoneNumber,
      _id: { $ne: req.params.id },
    });
    if (existingDriver) {
      return next(
        new ApiError(
          `Driver with this phone number already exists: ${req.body.phoneNumber}`,
          400
        )
      );
    }
  }

  if (req.body.nationalId) {
    const driverWithNationalId = await Driver.findOne({
      nationalId: req.body.nationalId,
      _id: { $ne: req.params.id },
    });
    if (driverWithNationalId) {
      return next(
        new ApiError(
          `Driver with this national ID already exists: ${req.body.nationalId}`,
          400
        )
      );
    }
  }

  if (req.body.licenseNumber) {
    const driverWithLicense = await Driver.findOne({
      licenseNumber: req.body.licenseNumber,
      _id: { $ne: req.params.id },
    });
    if (driverWithLicense) {
      return next(
        new ApiError(
          `Driver with this license number already exists: ${req.body.licenseNumber}`,
          400
        )
      );
    }
  }

  const currentDriver = await Driver.findById(req.params.id);
  if (!currentDriver) {
    return next(
      new ApiError(`No driver found with this id: ${req.params.id}`, 404)
    );
  }

  if (
    req.body.car &&
    (!currentDriver.car || req.body.car !== currentDriver.car.toString())
  ) {
    const newCar = await Car.findById(req.body.car);
    if (!newCar) {
      return next(new ApiError(`No car found with id: ${req.body.car}`, 404));
    }

    if (newCar.driver && newCar.driver.toString() !== req.params.id) {
      const existingDriverForCar = await Driver.findById(newCar.driver);
      if (existingDriverForCar) {
        return next(
          new ApiError(
            `Car is already assigned to driver: ${existingDriverForCar.name}`,
            400
          )
        );
      }
    }

    if (currentDriver.car) {
      await Car.findByIdAndUpdate(currentDriver.car, { $unset: { driver: 1 } });
    }

    await Car.findByIdAndUpdate(req.body.car, { driver: req.params.id });
  } else if (req.body.car === null && currentDriver.car) {
    await Car.findByIdAndUpdate(currentDriver.car, { $unset: { driver: 1 } });
  }

  const driver = await Driver.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  }).populate({
    path: "car",
    select: "brand model plateNumber year color status",
  });

  res.status(200).json({
    status: "success",
    message: "Driver updated successfully",
    data: driver,
  });
};

exports.deleteDriver = async (req, res, next) => {
  const driver = await Driver.findById(req.params.id);
  if (!driver) {
    return next(
      new ApiError(`No driver found with this id: ${req.params.id}`, 404)
    );
  }

  if (driver.car) {
    await Car.findByIdAndUpdate(driver.car, { $unset: { driver: 1 } });
  }

  await Driver.findByIdAndDelete(req.params.id);

  res.status(200).json({
    status: "success",
    message: "Driver deleted successfully",
  });
};

exports.getDriverMaintenanceRecords = async (req, res, next) => {
  const driver = await Driver.findById(req.params.id);
  if (!driver) {
    return next(
      new ApiError(`No driver found with this id: ${req.params.id}`, 404)
    );
  }

  const records = await Maintenance.find({ driver: req.params.id })
    .populate({
      path: "car",
      select: "brand model plateNumber year color status",
    })
    .populate({
      path: "subCategories",
      select: "name description",
      populate: {
        path: "category",
        select: "name",
      },
    })
    .sort({ date: -1 });

  res.status(200).json({
    status: "success",
    results: records.length,
    data: records,
  });
};

exports.getDriverMe = async (req, res, next) => {
  try {
    if (!req.driver) {
      return next(
        new ApiError("Access denied. This endpoint is only for drivers.", 403)
      );
    }

    const driver = await Driver.findById(req.driver._id).populate({
      path: "car",
      select: "brand model plateNumber year color status",
    });

    if (!driver) {
      return next(new ApiError("Driver not found", 404));
    }

    const maintenanceHistory = await Maintenance.find({
      driver: req.driver._id,
    })
      .populate({
        path: "car",
        select: "brand model plateNumber year color status",
      })
      .populate({
        path: "subCategories",
        select: "name description",
        populate: {
          path: "category",
          select: "name",
        },
      })
      .sort("-date");

    res.status(200).json({
      status: "success",
      data: {
        driver,
        maintenanceHistory,
      },
    });
  } catch (error) {
    next(error);
  }
};
