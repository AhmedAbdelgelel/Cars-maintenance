const Maintenance = require("../models/maintenanceModel");
const Car = require("../models/carsModel");
const SubCategory = require("../models/subCategoryModel");
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
    {
      $project: {
        _id: 0,
        totalCost: 1,
        totalMechanicCost: 1,
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

  // Validate custom fields if provided
  if (req.body.subCategories && req.body.subCategories.length > 0) {
    await validateCustomFields(
      req.body.subCategories,
      req.body.customFieldData || [],
      next
    );
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
    })
    .populate({
      path: "customFieldData.subcategoryId",
      select: "name",
    });

  res.status(201).json({
    status: "success",
    message: "Maintenance record created successfully",
    data: populatedRecord,
  });
});

// Helper function to validate custom fields
const validateCustomFields = async (subcategoryIds, customFieldData, next) => {
  // Fetch all subcategories with their custom fields
  const subcategories = await SubCategory.find({
    _id: { $in: subcategoryIds },
  }).select("_id name customFields");

  if (subcategories.length !== subcategoryIds.length) {
    return next(new ApiError("One or more subcategories not found", 404));
  }

  const errors = [];

  for (const subcategory of subcategories) {
    if (subcategory.customFields && subcategory.customFields.length > 0) {
      // Get required fields for this subcategory
      const requiredFields = subcategory.customFields.filter(
        (field) => field.isRequired
      );

      // Get provided custom field data for this subcategory
      const providedFields = customFieldData.filter(
        (data) =>
          data.subcategoryId &&
          data.subcategoryId.toString() === subcategory._id.toString()
      );

      // Check if all required fields are provided
      for (const requiredField of requiredFields) {
        const providedField = providedFields.find(
          (provided) => provided.fieldName === requiredField.fieldName
        );

        if (!providedField) {
          errors.push(
            `Required custom field '${requiredField.fieldName}' is missing for subcategory '${subcategory.name}'`
          );
        } else if (
          !providedField.fieldValue ||
          providedField.fieldValue.trim() === ""
        ) {
          errors.push(
            `Required custom field '${requiredField.fieldName}' cannot be empty for subcategory '${subcategory.name}'`
          );
        }
      }

      // Validate that all provided fields exist in the subcategory
      for (const providedField of providedFields) {
        const validField = subcategory.customFields.find(
          (field) => field.fieldName === providedField.fieldName
        );

        if (!validField) {
          errors.push(
            `Custom field '${providedField.fieldName}' is not defined for subcategory '${subcategory.name}'`
          );
        }
      }
    }
  }

  // Check for custom field data with invalid subcategory IDs
  for (const fieldData of customFieldData) {
    if (fieldData.subcategoryId) {
      const validSubcategory = subcategories.find(
        (sub) => sub._id.toString() === fieldData.subcategoryId.toString()
      );

      if (!validSubcategory) {
        errors.push(
          `Custom field data references invalid subcategory ID: ${fieldData.subcategoryId}`
        );
      }
    }
  }

  if (errors.length > 0) {
    return next(
      new ApiError(`Custom field validation failed: ${errors.join("; ")}`, 400)
    );
  }
};

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
