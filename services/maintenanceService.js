const Maintenance = require("../models/maintenanceModel");
const Car = require("../models/carsModel");
const ApiError = require("../utils/apiError");
const asyncHandler = require("express-async-handler");

exports.getAllMaintenanceRecords = asyncHandler(async (req, res) => {
  const records = await Maintenance.find()
    .select("-__v")
    .populate({
      path: "car",
      select:
        "_id plateNumber brand model year color status meterReading lastMeterUpdate",
    })
    .populate({
      path: "driver",
      select: "_id name phoneNumber nationalId licenseNumber",
    })
    .populate({
      path: "subCategories",
      select: "name description",
      populate: {
        path: "category",
        select: "name",
      },
    })
    .sort({ date: -1 });

  res.status(200).json({
    status: "success",
    results: records.length,
    data: records,
  });
});

exports.getMaintenanceCostRecords = asyncHandler(async (req, res) => {
  const records = await Maintenance.aggregate([
    {
      $group: {
        _id: null,
        totalCost: { $sum: "$cost" },
        totalMechanicCost: { $sum: "$mechanicCost" },
      },
    },
  ]);

  if (records.length === 0) {
    return res.status(200).json({
      status: "success",
      message: "No maintenance records found",
      data: {
        totalCost: 0,
        totalMechanicCost: 0,
      },
    });
  }

  res.status(200).json({
    status: "success",
    data: records[0],
  });
});

exports.getMaintenanceById = asyncHandler(async (req, res, next) => {
  const record = await Maintenance.findById(req.params.id)
    .select("-__v")
    .populate({
      path: "car",
      select:
        "_id plateNumber brand model year color status meterReading lastMeterUpdate",
    })
    .populate({
      path: "driver",
      select: "_id name phoneNumber nationalId licenseNumber",
    })
    .populate({
      path: "subCategories",
      select: "name description",
      populate: {
        path: "category",
        select: "name",
      },
    });

  if (!record) {
    return next(
      new ApiError(
        `No maintenance record found with this id: ${req.params.id}`,
        404
      )
    );
  }

  res.status(200).json({
    status: "success",
    data: record,
  });
});

exports.getMaintenanceByCarId = asyncHandler(async (req, res, next) => {
  const car = await Car.findById(req.params.carId);
  if (!car) {
    return next(new ApiError(`No car found with id: ${req.params.carId}`, 404));
  }

  const records = await Maintenance.find({ car: req.params.carId })
    .select("-__v")
    .populate({
      path: "car",
      select:
        "_id plateNumber brand model year color status meterReading lastMeterUpdate",
    })
    .populate({
      path: "driver",
      select: "_id name phoneNumber nationalId licenseNumber",
    })
    .populate({
      path: "subCategories",
      select: "name description",
      populate: {
        path: "category",
        select: "name",
      },
    })
    .sort({ date: -1 });

  res.status(200).json({
    status: "success",
    results: records.length,
    data: records,
  });
});

exports.createMaintenanceRecord = asyncHandler(async (req, res, next) => {
  const car = await Car.findById(req.body.car);
  if (!car) {
    return next(new ApiError(`No car found with id: ${req.body.car}`, 404));
  }

  const record = await Maintenance.create(req.body);
  await Car.findByIdAndUpdate(req.body.car, {
    $push: { maintenanceHistory: record._id },
  });

  const populatedRecord = await Maintenance.findById(record._id)
    .select("-__v")
    .populate({
      path: "car",
      select:
        "_id plateNumber brand model year color status meterReading lastMeterUpdate",
    })
    .populate({
      path: "driver",
      select: "_id name phoneNumber nationalId licenseNumber",
    })
    .populate({
      path: "subCategories",
      select: "name description",
      populate: {
        path: "category",
        select: "name",
      },
    });

  res.status(201).json({
    status: "success",
    message: "Maintenance record created successfully",
    data: populatedRecord,
  });
});

exports.updateMaintenanceRecord = asyncHandler(async (req, res, next) => {
  const record = await Maintenance.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  })
    .select("-__v")
    .populate({
      path: "car",
      select:
        "_id plateNumber brand model year color status meterReading lastMeterUpdate",
    })
    .populate({
      path: "driver",
      select: "_id name phoneNumber nationalId licenseNumber",
    })
    .populate({
      path: "subCategories",
      select: "name description",
      populate: {
        path: "category",
        select: "name",
      },
    });

  if (!record) {
    return next(
      new ApiError(
        `No maintenance record found with this id: ${req.params.id}`,
        404
      )
    );
  }

  res.status(200).json({
    status: "success",
    message: "Maintenance record updated successfully",
    data: record,
  });
});

exports.deleteMaintenanceRecord = asyncHandler(async (req, res, next) => {
  const record = await Maintenance.findById(req.params.id);

  if (!record) {
    return next(
      new ApiError(
        `No maintenance record found with this id: ${req.params.id}`,
        404
      )
    );
  }

  await Promise.all([
    Car.findByIdAndUpdate(record.car, {
      $pull: { maintenanceHistory: req.params.id },
    }),
    Maintenance.findByIdAndDelete(req.params.id),
  ]);

  res.status(200).json({
    status: "success",
    message: "Maintenance record deleted successfully",
  });
});
