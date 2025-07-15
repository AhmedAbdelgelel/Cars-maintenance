const SubCategory = require("../models/subCategoryModel");
const Category = require("../models/categoryModel");
const ApiError = require("../utils/apiError");
const asyncHandler = require("express-async-handler");
const ApiFeatures = require("../utils/apiFeatures");
const validateCustomFields = (customFields) => {
  if (!Array.isArray(customFields))
    return { isValid: false, message: "Custom fields must be an array" };

  const fieldNames = customFields.map((field) => field.fieldName);
  const uniqueFieldNames = [...new Set(fieldNames)];

  if (fieldNames.length !== uniqueFieldNames.length) {
    return { isValid: false, message: "Field names must be unique" };
  }

  return { isValid: true };
};

const checkCategoryExists = async (categoryId) => {
  if (!categoryId) return null;

  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(`No category found with id: ${categoryId}`, 404);
  }
  return category;
};

exports.getAllSubCategories = asyncHandler(async (req, res) => {
  const apiFeatures = new ApiFeatures(SubCategory.find(), req.query, [
    "name",
    "description",
  ]).search();
  const subCategories = await apiFeatures.query
    .select("-__v")
    .populate("category", "name");
  res.status(200).json({
    status: "success",
    results: subCategories.length,
    data: subCategories,
  });
});

exports.getSubCategoryById = asyncHandler(async (req, res, next) => {
  const subCategory = await SubCategory.findById(req.params.id).select("-__v");

  if (!subCategory) {
    return next(
      new ApiError(`No subcategory found with this id: ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    status: "success",
    data: subCategory,
  });
});

exports.getSubCategoriesByCategoryId = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.categoryId);
  if (!category) {
    return next(
      new ApiError(`No category found with id: ${req.params.categoryId}`, 404)
    );
  }

  const subCategories = await SubCategory.find({
    category: req.params.categoryId,
  }).select("-__v");

  res.status(200).json({
    status: "success",
    results: subCategories.length,
    data: subCategories,
  });
});

exports.createSubCategory = asyncHandler(async (req, res, next) => {
  // Accountants and admins can add subcategories
  if (!["admin", "accountant"].includes(req.user.role)) {
    return next(
      new ApiError("Only admin or accountant can add subcategories", 403)
    );
  }
  // Check if category exists
  const category = await checkCategoryExists(req.body.category);
  // Check for existing subcategory with same name
  const existingSubCategory = await SubCategory.findOne({
    name: req.body.name,
  });
  if (existingSubCategory) {
    return next(
      new ApiError(
        `Subcategory with name \"${req.body.name}\" already exists`,
        400
      )
    );
  }
  // Validate custom fields if provided
  if (req.body.customFields) {
    const validation = validateCustomFields(req.body.customFields);
    if (!validation.isValid) {
      return next(new ApiError(validation.message, 400));
    }
  }
  // Create subcategory
  const subCategory = await SubCategory.create(req.body);
  // Update category's subcategories array
  if (category) {
    await Category.findByIdAndUpdate(category._id, {
      $push: { subCategories: subCategory._id },
    });
  }
  const data = await SubCategory.findById(subCategory._id).select("-__v");
  res.status(201).json({
    status: "success",
    message: "Subcategory created successfully",
    data,
  });
});

exports.updateSubCategory = asyncHandler(async (req, res, next) => {
  if (req.body.category) {
    const category = await Category.findById(req.body.category);
    if (!category) {
      return next(
        new ApiError(`No category found with id: ${req.body.category}`, 404)
      );
    }
  }

  const subCategory = await SubCategory.findById(req.params.id);
  if (!subCategory) {
    return next(
      new ApiError(`No subcategory found with this id: ${req.params.id}`, 404)
    );
  }

  if (
    req.body.category &&
    subCategory.category &&
    req.body.category !== subCategory.category.toString()
  ) {
    await Category.findByIdAndUpdate(subCategory.category, {
      $pull: { subCategories: subCategory._id },
    });

    await Category.findByIdAndUpdate(req.body.category, {
      $push: { subCategories: subCategory._id },
    });
  }

  const updatedSubCategory = await SubCategory.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).select("-__v");

  res.status(200).json({
    status: "success",
    message: "Subcategory updated successfully",
    data: updatedSubCategory,
  });
});

exports.deleteSubCategory = asyncHandler(async (req, res, next) => {
  const subCategory = await SubCategory.findById(req.params.id);
  if (!subCategory) {
    return next(
      new ApiError(`No subcategory found with this id: ${req.params.id}`, 404)
    );
  }

  if (subCategory.category) {
    await Category.findByIdAndUpdate(subCategory.category, {
      $pull: { subCategories: subCategory._id },
    });
  }

  await SubCategory.findByIdAndDelete(req.params.id);

  res.status(200).json({
    status: "success",
    message: "Subcategory deleted successfully",
  });
});

exports.addCustomField = asyncHandler(async (req, res, next) => {
  const { fieldName, description, isRequired } = req.body;

  if (!fieldName || !description) {
    return next(new ApiError("Field name and description are required", 400));
  }

  const subCategory = await SubCategory.findById(req.params.id);
  if (!subCategory) {
    return next(
      new ApiError(`No subcategory found with id: ${req.params.id}`, 404)
    );
  }

  // Check if field name already exists
  const existingField = subCategory.customFields?.find(
    (field) => field.fieldName === fieldName
  );
  if (existingField) {
    return next(new ApiError(`Field "${fieldName}" already exists`, 400));
  }

  const newField = {
    fieldName,
    description,
    isRequired: isRequired || false,
  };

  if (!subCategory.customFields) {
    subCategory.customFields = [];
  }

  subCategory.customFields.push(newField);
  await subCategory.save();

  res.status(200).json({
    status: "success",
    message: "Custom field added successfully",
    data: subCategory,
  });
});

exports.updateCustomField = asyncHandler(async (req, res, next) => {
  const { fieldId } = req.params;
  const { description, isRequired } = req.body;

  const subCategory = await SubCategory.findById(req.params.id);
  if (!subCategory) {
    return next(
      new ApiError(`No subcategory found with id: ${req.params.id}`, 404)
    );
  }

  const fieldIndex = subCategory.customFields?.findIndex(
    (field) => field._id.toString() === fieldId
  );
  if (fieldIndex === -1 || fieldIndex === undefined) {
    return next(new ApiError("Custom field not found", 404));
  }

  // Update field properties
  if (description)
    subCategory.customFields[fieldIndex].description = description;
  if (typeof isRequired === "boolean")
    subCategory.customFields[fieldIndex].isRequired = isRequired;

  await subCategory.save();

  res.status(200).json({
    status: "success",
    message: "Custom field updated successfully",
    data: subCategory,
  });
});

exports.removeCustomField = asyncHandler(async (req, res, next) => {
  const { fieldId } = req.params;

  const subCategory = await SubCategory.findById(req.params.id);
  if (!subCategory) {
    return next(
      new ApiError(`No subcategory found with id: ${req.params.id}`, 404)
    );
  }

  if (!subCategory.customFields) {
    return next(new ApiError("No custom fields found", 404));
  }

  subCategory.customFields = subCategory.customFields.filter(
    (field) => field._id.toString() !== fieldId
  );

  await subCategory.save();

  res.status(200).json({
    status: "success",
    message: "Custom field removed successfully",
    data: subCategory,
  });
});

exports.getCustomFields = asyncHandler(async (req, res, next) => {
  const subCategory = await SubCategory.findById(req.params.id).select(
    "name customFields"
  );

  if (!subCategory) {
    return next(
      new ApiError(`No subcategory found with id: ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    status: "success",
    message: "Custom fields retrieved successfully",
    data: {
      subcategoryName: subCategory.name,
      customFields: subCategory.customFields || [],
    },
  });
});
