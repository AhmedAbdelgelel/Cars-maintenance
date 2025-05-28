const Car = require("../models/carsModel");
const Driver = require("../models/driverModel");
const Maintenance = require("../models/maintenanceModel");
const ApiError = require("../utils/apiError");

const textSearchFields = ["plateNumber", "brand", "model"];

const cleanData = {
  driver: (driver) =>
    driver
      ? {
          _id: driver._id,
          name: driver.name,
          phoneNumber: driver.phoneNumber,
          nationalId: driver.nationalId,
          licenseNumber: driver.licenseNumber,
        }
      : null,

  maintenance: (record) =>
    record
      ? {
          ...record,
          car: record.car ? { _id: record.car._id } : null,
          driver: record.driver
            ? { _id: record.driver._id, name: record.driver.name }
            : null,
          __v: undefined,
        }
      : null,

  car: (car) => {
    const cleaned = car.toObject();
    cleaned.__v = undefined;
    cleaned.driver = Array.isArray(cleaned.driver)
      ? cleaned.driver.map(cleanData.driver)
      : [];
    cleaned.maintenanceHistory = Array.isArray(cleaned.maintenanceHistory)
      ? cleaned.maintenanceHistory.map(cleanData.maintenance)
      : [];
    return cleaned;
  },
};

const dbOptions = {
  populate: {
    driver: {
      path: "driver",
      select: "_id name phoneNumber nationalId licenseNumber",
    },
    maintenanceHistory: {
      path: "maintenanceHistory",
      populate: [
        {
          path: "subCategories",
          select: "_id name description category",
          populate: { path: "category", select: "_id name" },
        },
        {
          path: "driver",
          select: "_id name phoneNumber nationalId licenseNumber",
        },
      ],
    },
  },
};

const buildSearchQuery = (filters) => {
  const query = {};
  textSearchFields.forEach((field) => {
    if (filters[field]) {
      query[field] = { $regex: filters[field], $options: "i" };
    }
  });
  if (filters.status) query.status = filters.status;
  return query;
};

const populateCarData = (query) =>
  query
    .populate(dbOptions.populate.driver)
    .populate(dbOptions.populate.maintenanceHistory);

exports.getAllCars = async (req, res) => {
  const cars = await populateCarData(Car.find(buildSearchQuery(req.query)));
  const cleanedCars = cars.map(cleanData.car);

  res.status(200).json({
    status: "success",
    results: cleanedCars.length,
    data: cleanedCars,
  });
};

exports.getCarById = async (req, res, next) => {
  const car = await populateCarData(Car.findById(req.params.id));

  if (!car) {
    return next(
      new ApiError(`No car found with this id: ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    status: "success",
    data: cleanData.car(car),
  });
};

exports.createCar = async (req, res, next) => {
  const existingCar = await Car.findOne({ plateNumber: req.body.plateNumber });

  if (existingCar) {
    return next(
      new ApiError(
        `Car with this plate number already exists: ${req.body.plateNumber}`,
        400
      )
    );
  }

  const car = await Car.create(req.body);

  if (req.body.driver) {
    await Promise.all([
      Driver.findByIdAndUpdate(req.body.driver, { car: car._id }),
      Car.findByIdAndUpdate(car._id, { driver: req.body.driver }),
    ]);
  }

  res.status(201).json({
    status: "success",
    message: "Car created successfully",
    data: car,
  });
};

exports.updateCar = async (req, res, next) => {
  try {
    // Check if status is being changed and if user is not admin
    if (req.body.status && !req.admin) {
      return next(
        new ApiError("Only administrators can change car status", 403)
      );
    }

    const car = await populateCarData(
      Car.findByIdAndUpdate(req.params.id, req.body, { new: true })
    );

    if (!car) {
      return next(new ApiError("No car found with this id", 404));
    }

    if (req.body.driver) {
      await Promise.all([
        Driver.updateMany(
          { car: car._id, _id: { $nin: req.body.driver } },
          { car: null }
        ),
        Driver.updateMany({ _id: { $in: req.body.driver } }, { car: car._id }),
      ]);
    }

    res.status(200).json({
      status: "success",
      message: "Car updated successfully",
      data: cleanData.car(car),
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteCar = async (req, res, next) => {
  const car = await Car.findById(req.params.id);

  if (!car) {
    return next(
      new ApiError(`No car found with this id: ${req.params.id}`, 404)
    );
  }

  await Promise.all([
    Maintenance.deleteMany({ car: req.params.id }),
    Car.findByIdAndDelete(req.params.id),
  ]);

  res.status(200).json({
    status: "success",
    message: "Car deleted successfully",
  });
};
