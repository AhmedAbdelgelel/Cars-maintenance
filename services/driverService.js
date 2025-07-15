const Driver = require("../models/driverModel");
const Car = require("../models/carsModel");
const Maintenance = require("../models/maintenanceModel");
const ApiError = require("../utils/apiError");
const asyncHandler = require("express-async-handler");
const ApiFeatures = require("../utils/apiFeatures");

const validateUniqueFields = async (data, driverId = null) => {
  const uniqueFields = [
    { field: "phoneNumber", message: "phone number" },
    { field: "nationalId", message: "national ID" },
    { field: "licenseNumber", message: "license number" },
  ];

  for (const { field, message } of uniqueFields) {
    if (data[field]) {
      const existing = await Driver.findOne({
        [field]: data[field],
        _id: { $ne: driverId },
      });

      if (existing) {
        throw new ApiError(
          `Driver with this ${message} already exists: ${data[field]}`,
          400
        );
      }
    }
  }
};

exports.createDriver = asyncHandler(async (req, res, next) => {
  // Only admin can add drivers
  if (req.user.role !== "admin") {
    return next(new ApiError("Only admin can add drivers", 403));
  }
  await validateUniqueFields(req.body);
  const driver = await Driver.create(req.body);
  res.status(201).json({
    status: "success",
    message: "Driver created successfully",
    data: driver,
  });
});

exports.getAllDrivers = asyncHandler(async (req, res) => {
  const apiFeatures = new ApiFeatures(Driver.find(), req.query, [
    "name",
    "phoneNumber",
    "licenseNumber",
    "nationalId",
  ]).search();
  const drivers = await apiFeatures.query
    .select(
      "_id name phoneNumber nationalId licenseNumber address car role createdAt updatedAt"
    )
    .populate({
      path: "car",
      select:
        "brand model plateNumber year color status meterReading lastMeterUpdate createdAt updatedAt drivers",
    });

  res.status(200).json({
    status: "success",
    results: drivers.length,
    data: drivers,
  });
});

exports.getDriverById = asyncHandler(async (req, res, next) => {
  const driver = await Driver.findById(req.params.id)
    .select(
      "_id name phoneNumber nationalId licenseNumber address car role createdAt updatedAt"
    )
    .populate({
      path: "car",
      select:
        "brand model plateNumber year color status meterReading lastMeterUpdate createdAt updatedAt drivers",
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
});

exports.getDriverByPhoneNumber = asyncHandler(async (req, res, next) => {
  const driver = await Driver.findOne({
    phoneNumber: req.params.phoneNumber,
  })
    .select(
      "_id name phoneNumber nationalId licenseNumber address car role createdAt updatedAt"
    )
    .populate({
      path: "car",
      select:
        "brand model plateNumber year color status meterReading lastMeterUpdate createdAt updatedAt drivers",
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
});

exports.updateDriver = asyncHandler(async (req, res, next) => {
  await validateUniqueFields(req.body, req.params.id);

  if (req.body.car === null) {
    const currentDriver = await Driver.findById(req.params.id);
    if (currentDriver?.car) {
      await Car.findByIdAndUpdate(currentDriver.car, {
        $unset: { driver: 1 },
      });
    }
  } else if (req.body.car) {
    await Car.findByIdAndUpdate(req.body.car, { driver: req.params.id });
  }

  const driver = await Driver.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  })
    .select(
      "_id name phoneNumber nationalId licenseNumber address car role createdAt updatedAt"
    )
    .populate({
      path: "car",
      select:
        "brand model plateNumber year color status meterReading lastMeterUpdate createdAt updatedAt drivers",
    });

  if (!driver) {
    return next(
      new ApiError(`No driver found with this id: ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    status: "success",
    message: "Driver updated successfully",
    data: driver,
  });
});

exports.deleteDriver = asyncHandler(async (req, res, next) => {
  // Only admin can delete drivers
  if (req.user.role !== "admin") {
    return next(new ApiError("Only admin can delete drivers", 403));
  }
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
});

exports.getDriverMaintenanceRecords = asyncHandler(async (req, res, next) => {
  const driver = await Driver.findById(req.params.id);

  if (!driver) {
    return next(
      new ApiError(`No driver found with this id: ${req.params.id}`, 404)
    );
  }

  const records = await Maintenance.find({ driver: req.params.id })
    .select("-__v")
    .populate([
      {
        path: "car",
        select: "brand model plateNumber year color status ",
      },
      {
        path: "subCategories",
        select: "name description ",
        populate: {
          path: "category",
          select: "name",
        },
      },
    ])
    .sort({ date: -1 });

  res.status(200).json({
    status: "success",
    results: records.length,
    data: records,
  });
});

exports.getDriverMe = asyncHandler(async (req, res, next) => {
  if (!req.driver) {
    return next(
      new ApiError("Access denied. This endpoint is only for drivers.", 403)
    );
  }

  const driver = await Driver.findById(req.driver._id)
    .select(
      "_id name phoneNumber nationalId licenseNumber address car role createdAt updatedAt"
    )
    .populate({
      path: "car",
      select:
        "brand model plateNumber year color status meterReading lastMeterUpdate createdAt updatedAt drivers",
    });

  const maintenanceHistory = await Maintenance.find({
    driver: req.driver._id,
  })
    .select("-__v")
    .populate([
      {
        path: "car",
        select: "brand model plateNumber year color status",
      },
      {
        path: "subCategories",
        select: "name description",
        populate: {
          path: "category",
          select: "name",
        },
      },
    ])
    .sort({ date: -1 });

  const driverObj = driver.toObject();
  driverObj.maintenanceHistory = maintenanceHistory;

  res.status(200).json({
    status: "success",
    data: driverObj,
  });
});

exports.getTotalDrivers = asyncHandler(async (req, res, next) => {
  const total = await Driver.countDocuments();
  res.status(200).json({
    status: "success",
    totalDrivers: total,
  });
});
