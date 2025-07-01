const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
  },
  type: {
    type: String,
    enum: [
      "maintenance_request",
      "request_accepted", 
      "request_rejected",
      "maintenance_completed"
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  relatedRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MaintenanceRequest",
  },
  relatedMaintenance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Maintenance",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Notification", notificationSchema);
