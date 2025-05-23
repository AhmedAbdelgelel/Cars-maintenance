const Category = require("../models/categoryModel");
const SubCategory = require("../models/subCategoryModel");
const ApiError = require("../utils/apiError");

exports.getAllCategories = async (req, res) => {
  const categories = await Category.find().populate("subCategories");

  res.status(200).json({
    status: "success",
    results: categories.length,
    data: categories,
  });
};

exports.getCategoryById = async (req, res, next) => {
  const category = await Category.findById(req.params.id).populate(
    "subCategories"
  );

  if (!category) {
    return next(
      new ApiError(`No category found with this id: ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    status: "success",
    data: category,
  });
};

exports.createCategory = async (req, res, next) => {
  const existingCategory = await Category.findOne({ name: req.body.name });
  if (existingCategory) {
    return next(
      new ApiError(`Category with name "${req.body.name}" already exists`, 400)
    );
  }

  const category = await Category.create(req.body);

  res.status(201).json({
    status: "success",
    message: "Category created successfully",
    data: category,
  });
};

exports.updateCategory = async (req, res, next) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  }).populate("subCategories");

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
};

exports.deleteCategory = async (req, res, next) => {
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
};
