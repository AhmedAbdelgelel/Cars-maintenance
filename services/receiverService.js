const Driver = require("../models/driverModel");
const MaintenanceRequest = require("../models/maintenanceRequestModel");
const Notification = require("../models/notificationModel");
const ApiError = require("../utils/apiError");
const asyncHandler = require("express-async-handler");

// Receiver gets pending maintenance requests (status: open)
exports.getPendingRequests = asyncHandler(async (req, res, next) => {
  const requests = await MaintenanceRequest.find({ status: "open" })
    .populate("driver", "name phoneNumber")
    .populate("car", "brand model plateNumber")
    .populate("subCategories", "name description")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: requests.length,
    data: requests,
  });
});

// Receiver accepts a maintenance request (changes status from open to accepted)
exports.acceptMaintenanceRequest = asyncHandler(async (req, res, next) => {
  const { requestId } = req.params;
  const receiver = req.driver;

  const maintenanceRequest = await MaintenanceRequest.findOne({
    _id: requestId,
    status: "open",
  }).populate("driver", "name");

  if (!maintenanceRequest) {
    return next(new ApiError("Request not found or already processed", 404));
  }

  // Change status to accepted
  maintenanceRequest.receiver = receiver._id;
  maintenanceRequest.status = "accepted";
  await maintenanceRequest.save();

  // Notify driver about acceptance
  await Notification.create({
    recipient: maintenanceRequest.driver._id,
    sender: receiver._id,
    type: "request_accepted",
    title: "Maintenance Request Accepted",
    message: `Your maintenance request has been accepted by ${receiver.name}. You can now upload receipt.`,
    relatedRequest: maintenanceRequest._id,
  });

  res.status(200).json({
    status: "success",
    message: "Maintenance request accepted successfully",
    data: maintenanceRequest,
  });
});

// Receiver rejects a maintenance request (changes status from open to rejected)
exports.rejectMaintenanceRequest = asyncHandler(async (req, res, next) => {
  const { requestId } = req.params;
  const { rejectionMessage } = req.body;
  const receiver = req.driver;

  if (!rejectionMessage) {
    return next(new ApiError("Rejection message is required", 400));
  }

  const maintenanceRequest = await MaintenanceRequest.findOne({
    _id: requestId,
    status: "open",
  }).populate("driver", "name");

  if (!maintenanceRequest) {
    return next(new ApiError("Request not found or already processed", 404));
  }

  // Change status to rejected
  maintenanceRequest.receiver = receiver._id;
  maintenanceRequest.status = "rejected";
  maintenanceRequest.rejectionMessage = rejectionMessage;
  await maintenanceRequest.save();

  // Notify driver about rejection
  await Notification.create({
    recipient: maintenanceRequest.driver._id,
    sender: receiver._id,
    type: "request_rejected",
    title: "Maintenance Request Rejected",
    message: `Your maintenance request has been rejected. Reason: ${rejectionMessage}`,
    relatedRequest: maintenanceRequest._id,
  });

  res.status(200).json({
    status: "success",
    message: "Maintenance request rejected successfully",
    data: maintenanceRequest,
  });
});

// Receiver gets their accepted requests
exports.getAcceptedRequests = asyncHandler(async (req, res, next) => {
  const receiver = req.driver;

  const requests = await MaintenanceRequest.find({
    receiver: receiver._id,
    status: { $in: ["accepted", "underReview", "completed"] },
  })
    .populate("driver", "name phoneNumber")
    .populate("car", "brand model plateNumber")
    .populate("subCategories", "name description")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: requests.length,
    data: requests,
  });
});

// Receiver gets their profile
exports.getReceiverMe = asyncHandler(async (req, res, next) => {
  const receiver = req.driver;

  if (receiver.role !== "receiver") {
    return next(
      new ApiError("Access denied. This endpoint is only for receivers.", 403)
    );
  }

  res.status(200).json({
    status: "success",
    data: receiver,
  });
});

// Admin creates a receiver
exports.createReceiver = asyncHandler(async (req, res, next) => {
  const existingReceiver = await Driver.findOne({
    $or: [
      { phoneNumber: req.body.phoneNumber },
      { nationalId: req.body.nationalId },
      { licenseNumber: req.body.licenseNumber },
    ],
  });

  if (existingReceiver) {
    return next(
      new ApiError(
        "Receiver with this phone, national ID, or license already exists",
        400
      )
    );
  }

  const receiver = await Driver.create({ ...req.body, role: "receiver" });

  res.status(201).json({
    status: "success",
    message: "Receiver created successfully",
    data: receiver,
  });
});

// Admin gets all receivers
exports.getAllReceivers = asyncHandler(async (req, res) => {
  const receivers = await Driver.find({ role: "receiver" }).select(
    "_id name phoneNumber nationalId licenseNumber address createdAt updatedAt"
  );

  res.status(200).json({
    status: "success",
    results: receivers.length,
    data: receivers,
  });
});
