const jwt = require("jsonwebtoken");
const Driver = require("../models/driverModel");
const Admin = require("../models/adminModel");
const ApiError = require("../utils/apiError");
exports.protect = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
      return next(
        new ApiError("You are not logged in. Please log in to get access", 401)
      );
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let currentUser = await Driver.findById(decoded.id).populate({
      path: "car",
      select:
        "brand model plateNumber year color status meterReading lastMeterUpdate",
    });
    if (!currentUser) {
      currentUser = await Admin.findById(decoded.id);
      if (currentUser) {
        req.admin = currentUser;
        return next();
      } else {
        return next(
          new ApiError("The user belonging to this token no longer exists", 401)
        );
      }
    }
    req.driver = currentUser;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return next(new ApiError("Invalid token. Please log in again", 401));
    }
    if (error.name === "TokenExpiredError") {
      return next(
        new ApiError("Your token has expired. Please log in again", 401)
      );
    }
    next(error);
  }
};
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (req.admin) {
      if (roles.includes("admin")) {
        return next();
      }
      return next(
        new ApiError("You do not have permission to perform this action", 403)
      );
    }
    if (!req.driver || !req.driver.role) {
      return next(
        new ApiError("You do not have permission to perform this action", 403)
      );
    }
    if (!roles.includes(req.driver.role)) {
      return next(
        new ApiError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};
