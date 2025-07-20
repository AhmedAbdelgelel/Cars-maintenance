const mongoose = require("mongoose");
const carsSchema = new mongoose.Schema({
  plateNumber: {
    type: String,
    unique: true,
  },
  brand: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
  driver: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },
  ],
  status: {
    type: String,
    enum: ["available", "in_use", "maintenance"],
    default: "available",
  },
  meterReading: {
    type: Number,
    default: 0,
  },
  lastOCRCheck: {
    type: Number,
    default: 0,
  },
  oilChangeReminderKM: {
    type: Number,
    default: 0,
  },
  oilChangeReminderPoint: {
    type: Number,
    default: 0,
  },
  examinationDate: {
    type: Date,
  },
  insuranceDate: {
    type: Date,
  },
  lastMeterUpdate: {
    type: Date,
  },
  lastUpdateSource: {
    type: String,
    enum: ['admin', 'ocr'],
    default: 'admin',
  },
  meterReadingsHistory: [
    {
      reading: { type: Number, required: true },
      date: { type: Date, required: true },
    },
  ],
  maintenanceHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Maintenance",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Car", carsSchema);
