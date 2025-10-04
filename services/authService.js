const Driver = require("../models/driverModel");
const Admin = require("../models/adminModel");
const Accountant = require("../models/accountantModel");
const Receiver = require("../models/receiverModel");
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

  if (role === "receiver") {
    const { email } = req.body;
    if (!email) {
      return next(new ApiError("Email is required for receiver registration", 400));
    }
    const exists = await Receiver.exists({ 
      $or: [{ phoneNumber }, { email: email.toLowerCase().trim() }] 
    });
    if (exists) {
      return next(
        new ApiError("Receiver with this phone number or email already exists", 400)
      );
    }
    const newReceiver = await Receiver.create({
      name,
      password,
      phoneNumber,
      email: email.toLowerCase().trim(),
      role: "receiver",
    });
    const token = generateToken(newReceiver._id, "receiver");
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
  const { phoneNumber, email, role } = req.body;

  if (!phoneNumber && !email) {
    return next(new ApiError("Please provide phone number or email", 400));
  }

  let user, token;
  if (role === "admin") {
    user = await Admin.findOne({ phoneNumber });
    if (!user) {
      return next(new ApiError("Incorrect phone number for admin", 401));
    }
    if (user.isActive === false) {
      return next(new ApiError("Your account has been deactivated", 401));
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
    if (user.isActive === false) {
      return next(new ApiError("Your account has been deactivated", 401));
    }
    token = generateToken(user._id, "accountant");
    return res
      .status(200)
      .json({ status: "success", token, user, role: "accountant" });
  } else if (role === "receiver") {
    // Support both email and phoneNumber for receivers
    const query = email ? { email: email.toLowerCase().trim() } : { phoneNumber };
    user = await Receiver.findOne(query);
    if (!user) {
      return next(new ApiError("Incorrect credentials for receiver", 401));
    }
    if (user.isActive === false) {
      return next(new ApiError("Your account has been deactivated", 401));
    }
    token = generateToken(user._id, "receiver");
    return res
      .status(200)
      .json({ status: "success", token, user, role: "receiver" });
  } else {
    user = await Driver.findOne({ phoneNumber })
      .select(
        "_id name phoneNumber nationalId licenseNumber address car role isActive createdAt updatedAt"
      )
      .populate({
        path: "car",
        select:
          "brand model plateNumber year color status meterReading lastMeterUpdate createdAt updatedAt drivers",
      });
    if (!user) {
      return next(new ApiError("Incorrect phone number for driver", 401));
    }
    if (user.isActive === false) {
      return next(new ApiError("Your account has been deactivated", 401));
    }
    token = generateToken(user._id, "driver");
    console.log(user, token);
    return res
      .status(200)
      .json({ status: "success", token, user, role: "driver" });
  }
});

exports.deleteAccount = asyncHandler(async (req, res, next) => {
  // User must be authenticated
  const user = req.driver || req.admin || req.accountant;
  if (!user) {
    return next(new ApiError("Authentication required", 401));
  }

  // Hard delete: permanently remove the account
  const userId = user._id;
  let deletedUser;

  if (req.driver) {
    deletedUser = await Driver.findByIdAndDelete(userId);
  } else if (req.admin) {
    deletedUser = await Admin.findByIdAndDelete(userId);
  } else if (req.accountant) {
    deletedUser = await Accountant.findByIdAndDelete(userId);
  }

  if (!deletedUser) {
    return next(new ApiError("Account not found", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Account deleted permanently",
  });
});

exports.logout = async (req, res) => {
  res
    .status(200)
    .clearCookie("jwt")
    .json({ status: "success", message: "Logged out successfully" });
};
