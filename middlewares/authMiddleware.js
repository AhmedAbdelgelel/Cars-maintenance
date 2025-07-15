const jwt = require("jsonwebtoken");
const Driver = require("../models/driverModel");
const Admin = require("../models/adminModel");
const Accountant = require("../models/accountantModel");
const ApiError = require("../utils/apiError");
const Receiver = require("../models/receiverModel");
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
    let currentUser;
    if (decoded.role === "receiver") {
      currentUser = await Receiver.findById(decoded.id);
      if (!currentUser) {
        return next(
          new ApiError("The user belonging to this token no longer exists", 401)
        );
      }
      if (currentUser.isActive === false) {
        return next(new ApiError("Your account has been deactivated", 401));
      }
      req.user = currentUser;
      req.receiver = currentUser;
      return next();
    } else if (decoded.role === "driver") {
      currentUser = await Driver.findById(decoded.id).populate({
        path: "car",
        select:
          "brand model plateNumber year color status meterReading lastMeterUpdate drivers",
      });
      if (!currentUser) {
        return next(
          new ApiError("The user belonging to this token no longer exists", 401)
        );
      }
      if (currentUser.isActive === false) {
        return next(new ApiError("Your account has been deactivated", 401));
      }
      req.user = currentUser;
      req.driver = currentUser;
      return next();
    } else if (decoded.role === "admin") {
      currentUser = await Admin.findById(decoded.id);
      if (!currentUser) {
        return next(
          new ApiError("The user belonging to this token no longer exists", 401)
        );
      }
      if (currentUser.isActive === false) {
        return next(new ApiError("Your account has been deactivated", 401));
      }
      req.user = currentUser;
      req.admin = currentUser;
      return next();
    } else if (decoded.role === "accountant") {
      currentUser = await Accountant.findById(decoded.id);
      if (!currentUser) {
        return next(
          new ApiError("The user belonging to this token no longer exists", 401)
        );
      }
      if (currentUser.isActive === false) {
        return next(new ApiError("Your account has been deactivated", 401));
      }
      req.user = currentUser;
      req.accountant = currentUser;
      return next();
    } else {
      return next(
        new ApiError("The user belonging to this token no longer exists", 401)
      );
    }
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
    // Get the user's role from the request object
    let userRole = null;

    if (req.admin) {
      userRole = req.admin.role || "admin";
    } else if (req.accountant) {
      userRole = req.accountant.role || "accountant";
    } else if (req.driver) {
      userRole = req.driver.role || "driver";
    } else if (req.receiver) {
      userRole = "receiver";
    } else if (req.user) {
      userRole = req.user.role;
    }

    if (!userRole) {
      return next(
        new ApiError("You do not have permission to perform this action", 403)
      );
    }

    if (roles.includes(userRole)) {
      return next();
    }

    return next(
      new ApiError("You do not have permission to perform this action", 403)
    );
  };
};
