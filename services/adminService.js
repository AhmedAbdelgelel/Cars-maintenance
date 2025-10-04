const Admin = require("../models/adminModel");
const Accountant = require("../models/accountantModel");
const ApiError = require("../utils/apiError");
const generateToken = require("../utils/generateToken");
const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");

exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, phoneNumber } = req.body;

  if (!name || !email || !password || !phoneNumber) {
    return next(new ApiError("Please provide all required fields", 400));
  }
  const existingAdmin = await Admin.findOne({
    $or: [{ email }, { phoneNumber }],
  });

  if (existingAdmin) {
    return next(
      new ApiError("Admin with this email or phone already exists", 400)
    );
  }

  // Password will be hashed automatically by the model's pre-save hook
  const createdAdmin = await Admin.create({
    name,
    email,
    password,
    phoneNumber,
  });

  const admin = await Admin.findById(createdAdmin._id).select("-__v -password");

  const token = generateToken(admin._id, admin.role || "admin");

  res.status(201).json({
    status: "success",
    token,
    admin,
  });
});

exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ApiError("Please provide email and password", 400));
  }

  // Try to find user in Admin model
  let user = await Admin.findOne({ email }).select("+password -__v");
  let role = "admin";

  // If not found, try Accountant model
  if (!user) {
    user = await Accountant.findOne({ email }).select("+password -__v");
    role = "accountant";
  }

  if (!user) {
    return next(new ApiError("Invalid credentials", 401));
  }

  if (!user.password) {
    return next(new ApiError("Password not set for this user. Please contact admin.", 401));
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return next(new ApiError("Invalid credentials", 401));
  }

  if (!user.isActive) {
    return next(new ApiError("Your account has been deactivated", 401));
  }

  const token = generateToken(user._id, user.role || role);
  const { password: pwd, ...safeUser } = user.toObject();

  res.status(200).json({
    status: "success",
    token,
    user: safeUser,
    role: user.role || role,
  });
});

exports.getAllAdmins = asyncHandler(async (req, res) => {
  const admins = await Admin.find({ isActive: true }).select("-password -__v");

  res.status(200).json({
    status: "success",
    results: admins.length,
    admins,
  });
});

exports.getAdminById = asyncHandler(async (req, res, next) => {
  const admin = await Admin.findById(req.params.id).select("-password -__v");

  if (!admin) {
    return next(new ApiError(`No admin found with id: ${req.params.id}`, 404));
  }

  res.status(200).json({
    status: "success",
    admin,
  });
});

exports.updateAdmin = asyncHandler(async (req, res, next) => {
  const { name, email, phoneNumber, isActive } = req.body;

  if (
    (email && (await Admin.exists({ email, _id: { $ne: req.params.id } }))) ||
    (phoneNumber &&
      (await Admin.exists({ phoneNumber, _id: { $ne: req.params.id } })))
  ) {
    return next(
      new ApiError("Admin with this email or phone already exists", 400)
    );
  }

  const admin = await Admin.findByIdAndUpdate(
    req.params.id,
    { name, email, phoneNumber, isActive },
    { new: true, runValidators: true }
  ).select("-password -__v");

  if (!admin) {
    return next(new ApiError(`No admin found with id: ${req.params.id}`, 404));
  }

  res.status(200).json({
    status: "success",
    message: "Admin updated",
    admin,
  });
});

exports.deleteAdmin = asyncHandler(async (req, res, next) => {
  const admin = await Admin.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!admin) {
    return next(new ApiError(`No admin found with id: ${req.params.id}`, 404));
  }

  res.status(200).json({
    status: "success",
    message: "Admin deactivated",
  });
});
