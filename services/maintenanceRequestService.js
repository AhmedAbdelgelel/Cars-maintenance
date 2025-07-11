const MaintenanceRequest = require("../models/maintenanceRequestModel");
const Car = require("../models/carsModel");
const Driver = require("../models/driverModel");
const SubCategory = require("../models/subCategoryModel");
const Notification = require("../models/notificationModel");
const ApiError = require("../utils/apiError");
const asyncHandler = require("express-async-handler");

// Driver creates a maintenance request (status: open)
exports.createMaintenanceRequest = asyncHandler(async (req, res, next) => {
  const driver = req.driver;

  if (!driver.car) {
    return next(new ApiError("No car is assigned to this driver", 400));
  }

  const car = await Car.findById(driver.car);
  if (!car) {
    return next(new ApiError("Car not found", 404));
  }

  // Accept mechanicCost and cost from request body (optional)
  const { subCategories, description, customFieldData, mechanicCost, cost } =
    req.body;

  // Create the maintenance request with status "open"
  const maintenanceRequest = await MaintenanceRequest.create({
    driver: driver._id,
    car: driver.car,
    subCategories,
    description,
    customFieldData: customFieldData || [],
    mechanicCost: mechanicCost || 0,
    cost: cost || 0,
  });

  // Notify all receivers about the new request
  const receivers = await Driver.find({ role: "receiver" });
  if (receivers.length > 0) {
    const notifications = receivers.map((receiver) => ({
      recipient: receiver._id,
      sender: driver._id,
      type: "maintenance_request",
      title: "New Maintenance Request",
      message: `${driver.name} submitted a maintenance request`,
      relatedRequest: maintenanceRequest._id,
    }));
    await Notification.insertMany(notifications);
  }

  const populatedRequest = await MaintenanceRequest.findById(
    maintenanceRequest._id
  )
    .populate("driver", "name phoneNumber")
    .populate("car", "brand model plateNumber")
    .populate("subCategories", "name description");

  res.status(201).json({
    status: "success",
    message: "Maintenance request created successfully",
    data: populatedRequest,
    customFieldData: maintenanceRequest.customFieldData || [],
  });
});

// Driver uploads receipt (changes status from accepted to underReview)
exports.uploadReceipt = asyncHandler(async (req, res, next) => {
  const { requestId } = req.params;
  const driver = req.driver;

  if (!req.file) {
    return next(new ApiError("Please upload a receipt image", 400));
  }

  const maintenanceRequest = await MaintenanceRequest.findOne({
    _id: requestId,
    driver: driver._id,
    status: "accepted",
  });

  if (!maintenanceRequest) {
    return next(
      new ApiError("Request not found or not in accepted status", 404)
    );
  }

  // Change status to underReview after receipt upload
  maintenanceRequest.receiptImage = req.file.path;
  maintenanceRequest.cost = req.body.cost;
  maintenanceRequest.mechanicCost = req.body.mechanicCost;
  maintenanceRequest.status = "underReview";
  await maintenanceRequest.save();

  // Notify admin
  const admins = await Driver.find({ role: "admin" });
  if (admins.length > 0) {
    const notifications = admins.map((admin) => ({
      recipient: admin._id,
      sender: driver._id,
      type: "maintenance_request",
      title: "Receipt Uploaded",
      message: `${driver.name} uploaded receipt for maintenance request`,
      relatedRequest: maintenanceRequest._id,
    }));
    await Notification.insertMany(notifications);
  }

  res.status(200).json({
    status: "success",
    message: "Receipt uploaded successfully, request is now under review",
    data: maintenanceRequest,
  });
});

// Get maintenance requests - drivers get their own, admins get all or filtered
exports.getMaintenanceRequests = asyncHandler(async (req, res, next) => {
  // Defensive: ensure req.driver and req.admin are not undefined before accessing .role
  let filter = {};

  if (req.driver && req.driver.role === "driver") {
    filter.driver = req.driver._id;
  } else if (req.admin && req.admin.role === "admin") {
    if (req.query.status) {
      filter.status = req.query.status;
    }
  } else {
    // If neither driver nor admin is present, do not access .role and return 401
    return next(new ApiError("Authentication required", 401));
  }

  const requests = await MaintenanceRequest.find(filter)
    .populate("driver", "name phoneNumber")
    .populate("car", "brand model plateNumber")
    .populate("subCategories", "name description")
    .populate("receiver", "name phoneNumber")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: requests.length,
    data: requests,
  });
});

// Get under review maintenance requests (admin only)
exports.getUnderReviewMaintenanceRequests = asyncHandler(
  async (req, res, next) => {
    if (!req.admin || req.admin.role !== "admin") {
      return next(new ApiError("Admin access required", 403));
    }
    const requests = await MaintenanceRequest.find({ status: "underReview" })
      .populate("driver", "name phoneNumber")
      .populate("car", "brand model plateNumber")
      .populate("subCategories", "name description")
      .populate("receiver", "name phoneNumber")
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      results: requests.length,
      data: requests,
    });
  }
);

// Legacy function - kept for backward compatibility if needed
exports.getMyMaintenanceRequests = asyncHandler(async (req, res, next) => {
  const driver = req.driver;

  const requests = await MaintenanceRequest.find({ driver: driver._id })
    .populate("car", "brand model plateNumber")
    .populate("subCategories", "name description")
    .populate("receiver", "name phoneNumber")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: requests.length,
    data: requests,
  });
});

// Legacy function - kept for backward compatibility if needed
exports.getAllMaintenanceRequests = asyncHandler(async (req, res, next) => {
  const requests = await MaintenanceRequest.find()
    .populate("driver", "name phoneNumber")
    .populate("car", "brand model plateNumber")
    .populate("subCategories", "name description")
    .populate("receiver", "name phoneNumber")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: requests.length,
    data: requests,
  });
});

// Admin completes a maintenance request (changes status to completed and creates maintenance record)
exports.completeMaintenanceRequest = asyncHandler(async (req, res, next) => {
  const { requestId } = req.params;

  const maintenanceRequest = await MaintenanceRequest.findById(requestId)
    .populate("driver", "name")
    .populate("car");

  if (!maintenanceRequest) {
    return next(new ApiError("Maintenance request not found", 404));
  }

  if (maintenanceRequest.status !== "underReview") {
    return next(new ApiError("Request must be under review to complete", 400));
  }

  // Validate that receipt and costs are provided
  if (
    !maintenanceRequest.receiptImage ||
    !maintenanceRequest.cost ||
    !maintenanceRequest.mechanicCost
  ) {
    return next(
      new ApiError(
        "Receipt and cost information are required to complete the request",
        400
      )
    );
  }

  // Only create maintenance record after admin approval and completion
  const Maintenance = require("../models/maintenanceModel");
  const maintenanceRecord = await Maintenance.create({
    car: maintenanceRequest.car._id,
    driver: maintenanceRequest.driver._id,
    subCategories: maintenanceRequest.subCategories,
    description: maintenanceRequest.description,
    customFieldData: maintenanceRequest.customFieldData,
    cost: maintenanceRequest.cost,
    mechanicCost: maintenanceRequest.mechanicCost,
  });

  // Update car's maintenance history only for completed records
  await Car.findByIdAndUpdate(maintenanceRequest.car._id, {
    $push: { maintenanceHistory: maintenanceRecord._id },
  });

  // Mark request as completed
  maintenanceRequest.status = "completed";
  await maintenanceRequest.save();

  // Notify driver about completion
  await Notification.create({
    recipient: maintenanceRequest.driver._id,
    type: "maintenance_completed",
    title: "Maintenance Request Completed",
    message:
      "Your maintenance request has been approved and completed by admin",
    relatedRequest: maintenanceRequest._id,
    relatedMaintenance: maintenanceRecord._id,
  });

  res.status(200).json({
    status: "success",
    message: "Maintenance request approved and completed successfully",
    data: {
      request: maintenanceRequest,
      maintenanceRecord: maintenanceRecord,
    },
  });
});

exports.getMaintenanceRequestById = asyncHandler(async (req, res, next) => {
  const request = await MaintenanceRequest.findById(req.params.id)
    .populate("driver", "name phoneNumber")
    .populate("car", "brand model plateNumber")
    .populate("subCategories", "name description")
    .populate("receiver", "name phoneNumber");

  if (!request) {
    return next(new ApiError("Maintenance request not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: request,
  });
});
