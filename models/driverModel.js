const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
    // required: true,
  },
  password: {
    type: String,
    select: false,
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
  isActive: {
    type: Boolean,
    default: true,
  },
  maintenanceHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Maintenance",
    },
  ],
});

// Hash password before saving
driverSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

module.exports = mongoose.model("Driver", driverSchema);
