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
  // المشاكل اللي حصلت في العربيه
  description: String,
  cost: {
    type: Number,
    required: true,
  },
  //المصنعيه بتاعه الميكانيكي
  mechanicCost: {
    type: Number,
    required: true,
  },

  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Maintenance", maintenanceSchema);
