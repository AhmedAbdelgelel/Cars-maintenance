const mongoose = require("mongoose");

const maintenanceRequestSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    required: true,
  },
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Car",
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
  },
  subCategories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true,
    },
  ],
  description: {
    type: String,
    required: true,
  },
  customFieldData: [
    {
      fieldName: {
        type: String,
        required: true,
      },
      fieldValue: {
        type: String,
        required: true,
      },
      subcategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubCategory",
        required: true,
      },
    },
  ],
  status: {
    type: String,
    enum: ["open", "accepted", "rejected", "underReview", "completed"],
    default: "open",
  },
  rejectionMessage: {
    type: String,
  },
  receiptImage: {
    type: String,
  },
  cost: {
    type: Number,
  },
  mechanicCost: {
    type: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("MaintenanceRequest", maintenanceRequestSchema);
