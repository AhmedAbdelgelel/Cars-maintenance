const Category = require("../models/categoryModel");
const ApiError = require("../utils/apiError");
const ApiFeatures = require("../utils/apiFeatures");
const asyncHandler = require("express-async-handler");

exports.getAllCategories = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.query.search) {
    // Find subcategories that match the search
    const SubCategory = require("../models/subCategoryModel");
    const subCats = await SubCategory.find({
      name: { $regex: req.query.search, $options: "i" },
    }).select("_id");
    const subCatIds = subCats.map((s) => s._id);
    filter = {
      $or: [
        { name: { $regex: req.query.search, $options: "i" } },
        { subCategories: { $in: subCatIds } },
      ],
    };
  }
  let categories = await Category.find(filter)
    .populate({
      path: "subCategories",
      select: "-__v",
    })
    .select("-__v");

  res.status(200).json({
    status: "success",
    results: categories.length,
    data: categories,
  });
});

exports.getCategoryById = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id)
    .populate({
      path: "subCategories",
      select: "-__v",
    })
    .select("-__v");

  if (!category) {
    return next(
      new ApiError(`No category found with this id: ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    status: "success",
    data: category,
  });
});

exports.createCategory = asyncHandler(async (req, res, next) => {
  // Only admin can add categories
  const role = req.user?.role || req.accountant?.role;
  if (role !== "admin") {
    return next(new ApiError("Only admin can add categories", 403));
  }
  const existingCategory = await Category.findOne({
    name: req.body.name,
  }).select("-__v");
  if (existingCategory) {
    return next(
      new ApiError(
        `Category with name \"${req.body.name}\" already exists`,
        400
      )
    );
  }
  const category = await Category.create(req.body);
  res.status(201).json({
    status: "success",
    message: "Category created successfully",
    data: category,
  });
});

exports.updateCategory = asyncHandler(async (req, res, next) => {
  const role = req.user?.role || req.accountant?.role;
  if (role !== "admin") {
    return next(new ApiError("Only admin can update categories", 403));
  }
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  })
    .populate({
      path: "subCategories",
      select: "-__v",
    })
    .select("-__v");

  if (!category) {
    return next(
      new ApiError(`No category found with this id: ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    status: "success",
    message: "Category updated successfully",
    data: category,
  });
});

exports.deleteCategory = asyncHandler(async (req, res, next) => {
  const role = req.user?.role || req.accountant?.role;
  if (role !== "admin") {
    return next(new ApiError("Only admin can delete categories", 403));
  }
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(
      new ApiError(`No category found with this id: ${req.params.id}`, 404)
    );
  }

  if (category.subCategories && category.subCategories.length > 0) {
    return next(
      new ApiError(
        `Cannot delete category with subcategories. Remove all subcategories first.`,
        400
      )
    );
  }

  await Category.findByIdAndDelete(req.params.id);

  res.status(200).json({
    status: "success",
    message: "Category deleted successfully",
  });
});
