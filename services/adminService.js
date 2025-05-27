const jwt = require('jsonwebtoken');
const Admin = require('../models/adminModel');
const ApiError = require('../utils/apiError');

// Helper function to sign JWT token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d'
  });
};

// Create and send JWT token
const createSendToken = (admin, statusCode, res) => {
  const token = signToken(admin._id);

  // Remove password from output
  admin.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      admin
    }
  });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    // Check if admin with this email already exists
    const adminWithEmail = await Admin.findOne({ email });
    if (adminWithEmail) {
      return next(
        new ApiError(
          `Admin with this email already exists: ${email}`,
          400
        )
      );
    }

    // Check if admin with this phone number already exists
    const adminWithPhone = await Admin.findOne({ phoneNumber });
    if (adminWithPhone) {
      return next(
        new ApiError(
          `Admin with this phone number already exists: ${phoneNumber}`,
          400
        )
      );
    }

    // Create new admin
    const newAdmin = await Admin.create({
      name,
      email,
      password,
      phoneNumber,
    });

    // Generate token and send response
    createSendToken(newAdmin, 201, res);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
      return next(new ApiError('Please provide email and password', 400));
    }

    // Check if admin exists and password is correct
    const admin = await Admin.findOne({ email }).select('+password');
    
    if (!admin || !(await admin.correctPassword(password, admin.password))) {
      return next(new ApiError('Incorrect email or password', 401));
    }

    // Check if admin is active
    if (!admin.isActive) {
      return next(new ApiError('Your account has been deactivated', 401));
    }

    // If everything is ok, send token to client
    createSendToken(admin, 200, res);
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

    const currentAdmin = await Admin.findById(decoded.id);
    if (!currentAdmin) {
      return next(new ApiError('The admin belonging to this token no longer exists', 401));
    }

    // Check if admin is active
    if (!currentAdmin.isActive) {
      return next(new ApiError('Your account has been deactivated', 401));
    }

    req.admin = currentAdmin;
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

exports.restrictToAdmin = (req, res, next) => {
  if (!req.admin || req.admin.role !== 'admin') {
    return next(new ApiError('You do not have permission to perform this action', 403));
  }
  next();
};

exports.getAllAdmins = async (req, res, next) => {
  try {
    const admins = await Admin.find({ isActive: true }).select('-password');
    
    res.status(200).json({
      status: 'success',
      results: admins.length,
      data: {
        admins
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getAdminById = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.params.id).select('-password');

    if (!admin) {
      return next(new ApiError(`No admin found with id: ${req.params.id}`, 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        admin
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAdmin = async (req, res, next) => {
  try {
    const { name, email, phoneNumber, isActive } = req.body;

    // Check if email is already taken by another admin
    if (email) {
      const existingAdmin = await Admin.findOne({
        email,
        _id: { $ne: req.params.id }
      });
      if (existingAdmin) {
        return next(new ApiError(`Admin with this email already exists: ${email}`, 400));
      }
    }

    // Check if phone number is already taken by another admin
    if (phoneNumber) {
      const existingAdmin = await Admin.findOne({
        phoneNumber,
        _id: { $ne: req.params.id }
      });
      if (existingAdmin) {
        return next(new ApiError(`Admin with this phone number already exists: ${phoneNumber}`, 400));
      }
    }

    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      { name, email, phoneNumber, isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!admin) {
      return next(new ApiError(`No admin found with id: ${req.params.id}`, 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Admin updated successfully',
      data: {
        admin
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteAdmin = async (req, res, next) => {
  try {
    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!admin) {
      return next(new ApiError(`No admin found with id: ${req.params.id}`, 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Admin deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};