const Car = require("../models/carsModel");
const Driver = require("../models/driverModel");
const Maintenance = require("../models/maintenanceModel");
const ApiError = require("../utils/apiError");

exports.getAllCars = async (req, res) => {
  const searchQuery = {};
  
  const { plateNumber, brand, model, status } = req.query;
  
  if (plateNumber) {
    searchQuery.plateNumber = { $regex: plateNumber, $options: 'i' };
  }
  
  if (brand) {
    searchQuery.brand = { $regex: brand, $options: 'i' };
  }

  if (model) {
    searchQuery.model = { $regex: model, $options: 'i' };
  }

  if (status) {
    searchQuery.status = status;
  }
  
  const cars = await Car.find(searchQuery)
    .populate({
      path: "driver",
      select: "name phoneNumber nationalId licenseNumber address",
    })
    .populate({
      path: "maintenanceHistory",
      populate: [
        {
          path: "subCategories",
          populate: {
            path: "category",
            select: "name",
          },
        },
        {
          path: "driver",
          select: "name phoneNumber nationalId licenseNumber",
        },
      ],
    });

  res.status(200).json({
    status: "success",
    results: cars.length,
    data: cars,
  });
};

exports.getCarById = async (req, res, next) => {
  const car = await Car.findById(req.params.id)
    .populate({
      path: "driver",
      select: "name phoneNumber nationalId licenseNumber address",
    })
    .populate({
      path: "maintenanceHistory",
      populate: [
        {
          path: "subCategories",
          populate: {
            path: "category",
            select: "name",
          },
        },
        {
          path: "driver",
          select: "name phoneNumber nationalId licenseNumber",
        },
      ],
    });

  if (!car) {
    return next(
      new ApiError(`No car found with this id: ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    status: "success",
    data: car,
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
    await Driver.findByIdAndUpdate(req.body.driver, { car: car._id });
  }

  res.status(201).json({
    status: "success",
    message: "Car created successfully",
    data: car,
  });
};

exports.updateCar = async (req, res, next) => {
  const car = await Car.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  })
    .populate({
      path: "driver",
      select: "name phoneNumber nationalId licenseNumber address",
    })
    .populate({
      path: "maintenanceHistory",
      populate: [
        {
          path: "subCategories",
          populate: {
            path: "category",
            select: "name",
          },
        },
        {
          path: "driver",
          select: "name phoneNumber nationalId licenseNumber",
        },
      ],
    });

  if (!car) {
    return next(
      new ApiError(`No car found with this id: ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    status: "success",
    message: "Car updated successfully",
    data: car,
  });
};

exports.deleteCar = async (req, res, next) => {
  const car = await Car.findById(req.params.id);

  if (!car) {
    return next(
      new ApiError(`No car found with this id: ${req.params.id}`, 404)
    );
  }

  await Maintenance.deleteMany({ car: req.params.id });

  await Car.findByIdAndDelete(req.params.id);

  res.status(200).json({
    status: "success",
    message: "Car deleted successfully",
  });
};
