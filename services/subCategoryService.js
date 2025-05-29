const SubCategory = require("../models/subCategoryModel");
const Category = require("../models/categoryModel");
const ApiError = require("../utils/apiError");

exports.getAllSubCategories = async (req, res) => {
  const subCategories = await SubCategory.find().select("-__v");
  res.status(200).json({
    status: "success",
    results: subCategories.length,
    data: subCategories,
  });
};

exports.getSubCategoryById = async (req, res, next) => {
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
};

exports.getSubCategoriesByCategoryId = async (req, res, next) => {
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
};

exports.createSubCategory = async (req, res, next) => {
  if (req.body.category) {
    const category = await Category.findById(req.body.category);
    if (!category) {
      return next(
        new ApiError(`No category found with id: ${req.body.category}`, 404)
      );
    }
  }

  const existingSubCategory = await SubCategory.findOne({
    name: req.body.name,
  });
  if (existingSubCategory) {
    return next(
      new ApiError(
        `Subcategory with name "${req.body.name}" already exists`,
        400
      )
    );
  }

  const subCategory = await SubCategory.create(req.body);

  if (req.body.category) {
    await Category.findByIdAndUpdate(req.body.category, {
      $push: { subCategories: subCategory._id },
    });
  }

  res.status(201).json({
    status: "success",
    message: "Subcategory created successfully",
    data: await SubCategory.findById(subCategory._id).select("-__v"),
  });
};

exports.updateSubCategory = async (req, res, next) => {
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
};

exports.deleteSubCategory = async (req, res, next) => {
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
};
