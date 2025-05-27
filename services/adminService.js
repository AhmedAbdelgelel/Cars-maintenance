const Admin = require("../models/adminModel");
const ApiError = require("../utils/apiError");
const generateToken = require("../utils/generateToken");
const createSendToken = (user) => {
  user.password = undefined;
  const role = user.role || "admin";
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
    const { name, email, password, phoneNumber } = req.body;
    const adminWithEmail = await Admin.findOne({ email });
    if (adminWithEmail) {
      return next(
        new ApiError(`Admin with this email already exists: ${email}`, 400)
      );
    }
    const adminWithPhone = await Admin.findOne({ phoneNumber });
    if (adminWithPhone) {
      return next(
        new ApiError(
          `Admin with this phone number already exists: ${phoneNumber}`,
          400
        )
      );
    }
    const newAdmin = await Admin.create({
      name,
      email,
      password,
      phoneNumber,
    });
    const { token, user } = createSendToken(newAdmin);
    res.status(201).json({
      status: "success",
      token,
      data: {
        admin: user,
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ApiError("Please provide email and password", 400));
    }
    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin || !(await admin.correctPassword(password, admin.password))) {
      return next(new ApiError("Incorrect email or password", 401));
    }
    if (!admin.isActive) {
      return next(new ApiError("Your account has been deactivated", 401));
    }
    const { token, user } = createSendToken(admin);
    res.status(200).json({
      status: "success",
      token,
      data: {
        admin: user,
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.getAllAdmins = async (req, res, next) => {
  try {
    const admins = await Admin.find({ isActive: true }).select("-password");
    res.status(200).json({
      status: "success",
      results: admins.length,
      data: {
        admins,
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.getAdminById = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.params.id).select("-password");
    if (!admin) {
      return next(
        new ApiError(`No admin found with id: ${req.params.id}`, 404)
      );
    }
    res.status(200).json({
      status: "success",
      data: {
        admin,
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.updateAdmin = async (req, res, next) => {
  try {
    const { name, email, phoneNumber, isActive } = req.body;
    if (email) {
      const existingAdmin = await Admin.findOne({
        email,
        _id: { $ne: req.params.id },
      });
      if (existingAdmin) {
        return next(
          new ApiError(`Admin with this email already exists: ${email}`, 400)
        );
      }
    }
    if (phoneNumber) {
      const existingAdmin = await Admin.findOne({
        phoneNumber,
        _id: { $ne: req.params.id },
      });
      if (existingAdmin) {
        return next(
          new ApiError(
            `Admin with this phone number already exists: ${phoneNumber}`,
            400
          )
        );
      }
    }
    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      { name, email, phoneNumber, isActive },
      { new: true, runValidators: true }
    ).select("-password");
    if (!admin) {
      return next(
        new ApiError(`No admin found with id: ${req.params.id}`, 404)
      );
    }
    res.status(200).json({
      status: "success",
      message: "Admin updated successfully",
      data: {
        admin,
      },
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
      return next(
        new ApiError(`No admin found with id: ${req.params.id}`, 404)
      );
    }
    res.status(200).json({
      status: "success",
      message: "Admin deactivated successfully",
    });
  } catch (error) {
    next(error);
  }
};
