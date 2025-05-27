const jwt = require('jsonwebtoken');
const Driver = require('../models/driverModel');
const ApiError = require('../utils/apiError');

// Helper function to sign JWT token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d'
  });
};

// Create and send JWT token
const createSendToken = (driver, statusCode, res) => {
  const token = signToken(driver._id);

  // Remove password from output
  driver.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      driver
    }
  });
};

exports.register = async (req, res, next) => {
  try {
    const { name, password, phoneNumber, nationalId, licenseNumber, address, car } = req.body;

    // Check if driver with this phone number already exists
    const driverWithPhone = await Driver.findOne({ phoneNumber });
    if (driverWithPhone) {
      return next(
        new ApiError(
          `Driver with this phone number already exists: ${phoneNumber}`,
          400
        )
      );
    }

    // Check if driver with this national ID already exists
    if (nationalId) {
      const driverWithNationalId = await Driver.findOne({
        nationalId
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

    // Check if driver with this license number already exists
    if (licenseNumber) {
      const driverWithLicense = await Driver.findOne({
        licenseNumber
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
 

    // Create new driver
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
      const Car = require('../models/carsModel');
      await Car.findByIdAndUpdate(car, { driver: newDriver._id });
    }

    // Generate token and send response
    createSendToken(newDriver, 201, res);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { phoneNumber, password } = req.body;

    // Check if phone and password exist
    if (!phoneNumber || !password) {
      return next(new ApiError('Please provide phone number and password', 400));
    }

    // Check if driver exists and password is correct
    const driver = await Driver.findOne({ phoneNumber }).select('+password');
    
    if (!driver || !(await driver.correctPassword(password, driver.password))) {
      return next(new ApiError('Incorrect phone number or password', 401));
    }

    // If everything is ok, send token to client
    createSendToken(driver, 200, res);
  } catch (error) {
    next(error);
  }
};

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new ApiError('You are not logged in. Please log in to get access', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const currentDriver = await Driver.findById(decoded.id);
    if (!currentDriver) {
      return next(new ApiError('The driver belonging to this token no longer exists', 401));
    }

    req.driver = currentDriver;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new ApiError('Invalid token. Please log in again', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError('Your token has expired. Please log in again', 401));
    }
    next(error);
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.driver || !req.driver.role) {
      return next(new ApiError('You do not have permission to perform this action', 403));
    }
    if (!roles.includes(req.driver.role)) {
      return next(new ApiError('You do not have permission to perform this action', 403));
    }
    next();
  };
};