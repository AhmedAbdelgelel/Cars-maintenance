const Driver = require("../models/driverModel");
const ApiError = require("../utils/apiError");
const generateToken = require("../utils/generateToken");
const createSendToken = (user) => {
  user.password = undefined;
  const role = user.role || "driver";
  const token = generateToken(user._id, role);
  return {
    token,
    user: {
      ...user.toObject(),
      role,
    },
  };
};
exports.register = async (req, res, next) => {
  try {
    const {
      name,
      password,
      phoneNumber,
      nationalId,
      licenseNumber,
      address,
      car,
    } = req.body;
    const driverWithPhone = await Driver.findOne({ phoneNumber });
    if (driverWithPhone) {
      return next(
        new ApiError(
          `Driver with this phone number already exists: ${phoneNumber}`,
          400
        )
      );
    }
    if (nationalId) {
      const driverWithNationalId = await Driver.findOne({
        nationalId,
      });
      if (driverWithNationalId) {
        return next(
          new ApiError(
            `Driver with this national ID already exists: ${nationalId}`,
            400
          )
        );
      }
    }
    if (licenseNumber) {
      const driverWithLicense = await Driver.findOne({
        licenseNumber,
      });
      if (driverWithLicense) {
        return next(
          new ApiError(
            `Driver with this license number already exists: ${licenseNumber}`,
            400
          )
        );
      }
    }
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
      await Car.findByIdAndUpdate(car, { driver: newDriver._id });
    }
    const { token, user } = createSendToken(newDriver);
    res.status(201).json({
      status: "success",
      token,
      data: {
        driver: user,
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.login = async (req, res, next) => {
  try {
    const { phoneNumber, password } = req.body;
    if (!phoneNumber || !password) {
      return next(
        new ApiError("Please provide phone number and password", 400)
      );
    }

    // Get driver with password and populate car information
    const driver = await Driver.findOne({ phoneNumber })
      .select("+password")
      .populate({
        path: "car",
        select:
          "brand model plateNumber year color status meterReading lastMeterUpdate",
      });

    if (!driver || !(await driver.correctPassword(password, driver.password))) {
      return next(new ApiError("Incorrect phone number or password", 401));
    }

    const { token, user } = createSendToken(driver);

    // Add meter reading data explicitly
    const meterData = {
      lastMeterReading: driver.lastMeterReading,
      lastMeterUpdate: driver.lastMeterUpdate,
      carMeterReading: driver.car ? driver.car.meterReading : null,
      carLastMeterUpdate: driver.car ? driver.car.lastMeterUpdate : null,
    };

    res.status(200).json({
      status: "success",
      token,
      meterData,
      data: {
        driver: user,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
};
