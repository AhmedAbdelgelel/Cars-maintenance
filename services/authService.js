const Driver = require("../models/driverModel");
const Admin = require("../models/adminModel");
const Accountant = require("../models/accountantModel");
const ApiError = require("../utils/apiError");
const generateToken = require("../utils/generateToken");
const asyncHandler = require("express-async-handler");

exports.register = asyncHandler(async (req, res, next) => {
  const isMobileRequest =
    req.headers["user-agent"]?.toLowerCase().includes("mobile") ||
    req.headers["is-mobile-app"] === "true";

  const {
    name,
    password,
    phoneNumber,
    nationalId,
    licenseNumber,
    address,
    role,
  } = req.body;

  if (role === "admin") {
    if (isMobileRequest) {
      return next(
        new ApiError(
          "Admin registration is not allowed from mobile devices",
          403
        )
      );
    }
    const exists = await Admin.exists({ phoneNumber });
    if (exists) {
      return next(
        new ApiError("Admin with this phone number already exists", 400)
      );
    }
    const newAdmin = await Admin.create({
      name,
      password,
      phoneNumber,
      role: "admin",
    });
    const token = generateToken(newAdmin._id, "admin");
    return res.status(201).json({ status: "success", token });
  }

  if (role === "accountant") {
    if (isMobileRequest) {
      return next(
        new ApiError(
          "Accountant registration is not allowed from mobile devices",
          403
        )
      );
    }
    const exists = await Accountant.exists({ phoneNumber });
    if (exists) {
      return next(
        new ApiError("Accountant with this phone number already exists", 400)
      );
    }
    const newAccountant = await Accountant.create({
      name,
      password,
      phoneNumber,
      role: "accountant",
    });
    const token = generateToken(newAccountant._id, "accountant");
    return res.status(201).json({ status: "success", token });
  }

  const exists = await Driver.exists({
    $or: [{ phoneNumber }, { nationalId }, { licenseNumber }],
  });
  if (exists) {
    return next(
      new ApiError(
        "User with this phone, national ID, or license already exists",
        400
      )
    );
  }
  const newDriver = await Driver.create({
    name,
    password,
    phoneNumber,
    nationalId,
    licenseNumber,
    address,
    role: "driver",
  });
  const token = generateToken(newDriver._id, "driver");
  res.status(201).json({ status: "success", token });
});

exports.login = asyncHandler(async (req, res, next) => {
  const { phoneNumber, role } = req.body;

  if (!phoneNumber) {
    return next(new ApiError("Please provide phone number", 400));
  }

  let user, token;
  if (role === "admin") {
    user = await Admin.findOne({ phoneNumber });
    if (!user) {
      return next(new ApiError("Incorrect phone number for admin", 401));
    }
    token = generateToken(user._id, "admin");
    return res
      .status(200)
      .json({ status: "success", token, user, role: "admin" });
  } else if (role === "accountant") {
    user = await Accountant.findOne({ phoneNumber });
    if (!user) {
      return next(new ApiError("Incorrect phone number for accountant", 401));
    }
    token = generateToken(user._id, "accountant");
    return res
      .status(200)
      .json({ status: "success", token, user, role: "accountant" });
  } else {
    user = await Driver.findOne({ phoneNumber })
      .select(
        "_id name phoneNumber nationalId licenseNumber address car role createdAt updatedAt"
      )
      .populate({
        path: "car",
        select:
          "brand model plateNumber year color status meterReading lastMeterUpdate createdAt updatedAt drivers",
      });
    if (!user) {
      return next(new ApiError("Incorrect phone number for driver", 401));
    }
    token = generateToken(user._id, "driver");
    return res
      .status(200)
      .json({ status: "success", token, user, role: "driver" });
  }
});

exports.logout = async (req, res) => {
  res
    .status(200)
    .clearCookie("jwt")
    .json({ status: "success", message: "Logged out successfully" });
};
