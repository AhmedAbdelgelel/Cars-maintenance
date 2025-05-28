const Driver = require("../models/driverModel");
const ApiError = require("../utils/apiError");
const generateToken = require("../utils/generateToken");

const populateOptions = {
  car: {
    path: "car",
    select:
      "brand model plateNumber year color status meterReading lastMeterUpdate createdAt updatedAt drivers",
  },
};

const cleanDriverData = (driver) => {
  const driverObj = driver.toObject();
  delete driverObj.__v;
  delete driverObj.maintenanceHistory;
  if (driverObj.car) {
    delete driverObj.car.__v;
  }
  return driverObj;
};

const createSendToken = (user) => {
  return generateToken(user._id, user.role || "driver");
};

exports.register = async (req, res, next) => {
  try {
    const isMobileRequest =
      req.headers["user-agent"]?.toLowerCase().includes("mobile") ||
      req.headers["is-mobile-app"] === "true";

    if (isMobileRequest && req.body.role === "admin") {
      return next(
        new ApiError(
          "Admin registration is not allowed from mobile devices",
          403
        )
      );
    }

    const {
      name,
      password,
      phoneNumber,
      nationalId,
      licenseNumber,
      address,
      car,
    } = req.body;

    const exists = await Driver.exists({
      $or: [{ phoneNumber }, { nationalId }, { licenseNumber }],
    });
    if (exists) {
      return next(
        new ApiError(
          "Driver with this phone, national ID, or license already exists",
          400
        )
      );
    }

    if (isMobileRequest) req.body.role = "driver";

    const newDriver = await Driver.create({
      name,
      password,
      phoneNumber,
      nationalId,
      licenseNumber,
      address,
      car,
    });

    if (car) {
      const Car = require("../models/carsModel");
      await Car.findByIdAndUpdate(car, { $push: { drivers: newDriver._id } });
      if (!newDriver.car || newDriver.car.toString() !== car.toString()) {
        await Driver.findByIdAndUpdate(newDriver._id, { car });
      }
    }

    const token = createSendToken(newDriver);

    res.status(201).json({
      status: "success",
      token,
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return next(new ApiError("Please provide phone number", 400));
    }

    const driver = await Driver.findOne({ phoneNumber }).populate(
      populateOptions.car
    );

    if (!driver) {
      return next(new ApiError("Incorrect phone number", 401));
    }

    const token = createSendToken(driver);

    res.status(200).json({
      status: "success",
      token,
      driver: cleanDriverData(driver),
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res) => {
  res
    .status(200)
    .json({ status: "success", message: "Logged out successfully" });
};
