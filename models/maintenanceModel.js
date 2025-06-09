const mongoose = require("mongoose");
const maintenanceSchema = new mongoose.Schema({
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Car",
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
  },
  subCategories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
    },
  ],
  description: String,
  cost: {
    type: Number,
    required: true,
  },
  mechanicCost: {
    type: Number,
    required: true,
  },
  // Custom field responses from driver
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
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Maintenance", maintenanceSchema);
