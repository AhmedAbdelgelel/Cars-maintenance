const Driver = require("../models/driverModel");
const ApiError = require("../utils/apiError");
const generateToken = require("../utils/generateToken");

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

    const { name, password, phoneNumber, nationalId, licenseNumber, address } =
      req.body;

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
    });

    const token = generateToken(newDriver._id, newDriver.role || "driver");

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

    const driver = await Driver.findOne({ phoneNumber })
      .select(
        "_id name phoneNumber nationalId licenseNumber address car role createdAt updatedAt"
      )
      .populate({
        path: "car",
        select:
          "brand model plateNumber year color status meterReading lastMeterUpdate createdAt updatedAt drivers",
      });

    if (!driver) {
      return next(new ApiError("Incorrect phone number", 401));
    }

    const token = generateToken(driver._id, driver.role || "driver");

    res.status(200).json({
      status: "success",
      token,
      driver,
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
