const Maintenance = require("../models/maintenanceModel");
const Car = require("../models/carsModel");
const ApiError = require("../utils/apiError");

const dbOptions = {
  populate: {
    car: {
      path: "car",
      select:
        "_id plateNumber brand model year color status meterReading lastMeterUpdate",
    },
    driver: {
      path: "driver",
      select: "_id name phoneNumber nationalId licenseNumber",
    },
    subCategories: {
      path: "subCategories",
      select: "name description",
      populate: {
        path: "category",
        select: "name",
      },
    },
  },
};

const cleanRecord = (record) => {
  const obj = record.toObject();
  delete obj.__v;
  if (obj.car && typeof obj.car === "object") {
    delete obj.car.__v;
  }
  if (obj.driver && typeof obj.driver === "object") {
    delete obj.driver.__v;
    delete obj.driver.password;
    delete obj.driver.carMeter;
    delete obj.driver.lastMeterReading;
    delete obj.driver.lastMeterUpdate;
    delete obj.driver.maintenanceHistory;
  }
  return obj;
};

const populateRecord = (query) =>
  query
    .populate(dbOptions.populate.car)
    .populate(dbOptions.populate.driver)
    .populate(dbOptions.populate.subCategories);

exports.getAllMaintenanceRecords = async (req, res) => {
  const records = await populateRecord(Maintenance.find()).sort({ date: -1 });
  const cleanRecords = records.map(cleanRecord);

  res.status(200).json({
    status: "success",
    results: cleanRecords.length,
    data: cleanRecords,
  });
};

exports.getMaintenanceById = async (req, res, next) => {
  const record = await populateRecord(Maintenance.findById(req.params.id));

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
    data: cleanRecord(record),
  });
};

exports.getMaintenanceByCarId = async (req, res, next) => {
  const car = await Car.findById(req.params.carId);
  if (!car) {
    return next(new ApiError(`No car found with id: ${req.params.carId}`, 404));
  }

  const records = await Maintenance.find({ car: req.params.carId })
    .populate({
      path: "car",
      select:
        "_id plateNumber brand model year color status meterReading lastMeterUpdate",
    })
    .populate({
      path: "driver",
      select: "_id name phoneNumber nationalId licenseNumber",
    })
    .sort({ date: -1 });

  const cleanRecords = records.map((record) => {
    const obj = record.toObject();
    delete obj.__v;
    if (obj.car && typeof obj.car === "object") delete obj.car.__v;
    if (obj.driver && typeof obj.driver === "object") {
      delete obj.driver.__v;
      delete obj.driver.password;
      delete obj.driver.carMeter;
      delete obj.driver.lastMeterReading;
      delete obj.driver.lastMeterUpdate;
      delete obj.driver.maintenanceHistory;
    }
    return obj;
  });

  res.status(200).json({
    status: "success",
    results: cleanRecords.length,
    data: cleanRecords,
  });
};

exports.createMaintenanceRecord = async (req, res, next) => {
  const car = await Car.findById(req.body.car);
  if (!car) {
    return next(new ApiError(`No car found with id: ${req.body.car}`, 404));
  }

  const record = await Maintenance.create(req.body);
  await Car.findByIdAndUpdate(req.body.car, {
    $push: { maintenanceHistory: record._id },
  });

  const populatedRecord = await populateRecord(
    Maintenance.findById(record._id)
  );

  res.status(201).json({
    status: "success",
    message: "Maintenance record created successfully",
    data: cleanRecord(populatedRecord),
  });
};

exports.updateMaintenanceRecord = async (req, res, next) => {
  const record = await populateRecord(
    Maintenance.findByIdAndUpdate(req.params.id, req.body, { new: true })
  );

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
    data: cleanRecord(record),
  });
};

exports.deleteMaintenanceRecord = async (req, res, next) => {
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
};
