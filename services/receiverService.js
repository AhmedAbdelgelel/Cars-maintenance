const Receiver = require("../models/receiverModel");
const MaintenanceRequest = require("../models/maintenanceRequestModel");
const Notification = require("../models/notificationModel");
const ApiError = require("../utils/apiError");
const asyncHandler = require("express-async-handler");
const generateToken = require("../utils/generateToken");
const bcrypt = require("bcryptjs");
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
  const receiver = req.receiver;

  if (!receiver) {
    return next(new ApiError("No receiver found in request context", 401));
  }

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
  const receiver = req.receiver;

  if (!receiver) {
    return next(new ApiError("No receiver found in request context", 401));
  }

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
  const receiver = req.receiver;

  if (!receiver) {
    return next(new ApiError("No receiver found in request context", 401));
  }

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
  const receiver = req.receiver;
  if (!receiver) {
    return next(new ApiError("No receiver found in request context", 401));
  }
  res.status(200).json({
    status: "success",
    data: receiver,
  });
});

// Admin creates a receiver
exports.createReceiver = asyncHandler(async (req, res, next) => {
  const { name, email, phoneNumber, password } = req.body;
  if (!name || !email || !phoneNumber || !password) {
    return next(
      new ApiError(
        "All fields (name, email, phoneNumber, password) are required",
        400
      )
    );
  }
  const existingReceiver = await Receiver.findOne({
    $or: [{ phoneNumber }, { email }],
  });
  if (existingReceiver) {
    return next(
      new ApiError("Receiver with this phone or email already exists", 400)
    );
  }
  const hashedPassword = await bcrypt.hash(password, 12);
  const receiver = await Receiver.create({
    name,
    email,
    phoneNumber,
    password: hashedPassword,
  });
  res.status(201).json({
    status: "success",
    message: "Receiver created successfully",
    data: receiver,
  });
});

// Admin gets all receivers
exports.getAllReceivers = asyncHandler(async (req, res) => {
  const receivers = await Receiver.find().select(
    "_id name email phoneNumber createdAt"
  );
  res.status(200).json({
    status: "success",
    results: receivers.length,
    data: receivers,
  });
});

// Receiver login
exports.loginReceiver = asyncHandler(async (req, res, next) => {
  const { phoneNumber, password } = req.body;
  if (!phoneNumber || !password) {
    return next(new ApiError("Please provide phone number and password", 400));
  }
  const receiver = await Receiver.findOne({ phoneNumber });
  if (!receiver) {
    return next(new ApiError("Receiver not found", 401));
  }

  const isMatch = await bcrypt.compare(password, receiver.password);
  if (!isMatch) {
    return next(new ApiError("Incorrect password", 401));
  }
  const token = generateToken(receiver._id, "receiver");
  res.status(200).json({
    status: "success",
    token: token,
    receiver: receiver,
  });
});
