const Driver = require("../models/driverModel");
const Car = require("../models/carsModel");
const Maintenance = require("../models/maintenanceModel");
const ApiError = require("../utils/apiError");

const dbOptions = {
  car: {
    path: "car",
    select:
      "brand model plateNumber year color status meterReading lastMeterUpdate createdAt updatedAt",
  },
  maintenance: {
    path: "maintenanceHistory",
    populate: [
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
    ],
  },
};

const cleanDriver = (driver) => {
  const obj = driver.toObject ? driver.toObject() : driver;
  delete obj.__v;
  delete obj.password;
  delete obj.maintenanceHistory;
  delete obj.carMeter;
  delete obj.lastMeterReading;
  delete obj.lastMeterUpdate;
  return obj;
};

const validateUniqueFields = async (data, driverId = null) => {
  const uniqueFields = [
    { field: "phoneNumber", message: "phone number" },
    { field: "nationalId", message: "national ID" },
    { field: "licenseNumber", message: "license number" },
    { field: "email", message: "email" },
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

exports.getAllDrivers = async (req, res) => {
  const drivers = await Driver.find().populate(dbOptions.car);
  const data = drivers.map(cleanDriver);

  res.status(200).json({
    status: "success",
    results: data.length,
    data,
  });
};

exports.getDriverById = async (req, res, next) => {
  const driver = await Driver.findById(req.params.id).populate(dbOptions.car);

  if (!driver) {
    return next(
      new ApiError(`No driver found with this id: ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    status: "success",
    data: cleanDriver(driver),
  });
};

exports.getDriverByPhoneNumber = async (req, res, next) => {
  const driver = await Driver.findOne({
    phoneNumber: req.params.phoneNumber,
  }).populate(dbOptions.car);

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
    data: cleanDriver(driver),
  });
};

exports.updateDriver = async (req, res, next) => {
  try {
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
    }).populate(dbOptions.car);

    if (!driver) {
      return next(
        new ApiError(`No driver found with this id: ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      status: "success",
      message: "Driver updated successfully",
      data: cleanDriver(driver),
    });
  } catch (error) {
    next(error);
  }
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
    .populate(dbOptions.maintenance.populate)
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

    const driver = await Driver.findById(req.driver._id)
      .select("-__v -password")
      .populate(dbOptions.car);

    const maintenanceHistory = await Maintenance.find({
      driver: req.driver._id,
    })
      .populate(dbOptions.maintenance.populate)
      .sort({ date: -1 });

    const driverObj = driver.toObject();
    delete driverObj.carMeter;
    delete driverObj.lastMeterReading;
    delete driverObj.lastMeterUpdate;
    delete driverObj.maintenanceHistory;
    driverObj.maintenanceHistory = maintenanceHistory.map((m) => {
      const mObj = m.toObject();
      delete mObj.__v;
      return mObj;
    });

    res.status(200).json({
      status: "success",
      data: driverObj,
    });
  } catch (error) {
    next(error);
  }
};

exports.searchDrivers = async (req, res, next) => {
  const { name, phoneNumber, licenseNumber, nationalId } = req.query;

  if (!name && !phoneNumber && !licenseNumber && !nationalId) {
    return next(
      new ApiError(
        "Please provide at least one search parameter (name, phoneNumber, licenseNumber, or nationalId)",
        400
      )
    );
  }

  const searchQuery = {};

  if (name) searchQuery.name = { $regex: name, $options: "i" };
  if (phoneNumber)
    searchQuery.phoneNumber = { $regex: phoneNumber, $options: "i" };
  if (licenseNumber)
    searchQuery.licenseNumber = { $regex: licenseNumber, $options: "i" };
  if (nationalId)
    searchQuery.nationalId = { $regex: nationalId, $options: "i" };

  const drivers = await Driver.find(searchQuery).populate(dbOptions.car);

  res.status(200).json({
    status: "success",
    results: drivers.length,
    data: drivers,
  });
};
