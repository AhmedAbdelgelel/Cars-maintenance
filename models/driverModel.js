const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
  },
  nationalId: {
    type: String,
    required: true,
    unique: true,
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true,
  },
  address: {
    type: String,
    required: true,
  },
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Car",
  },
  role: {
    type: String,
    enum: ["driver", "admin"],
    default: "driver",
  },
  maintenanceHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Maintenance",
    },
  ],
});

module.exports = mongoose.model("Driver", driverSchema);
