const express = require("express");
const router = express.Router();
const {
  getAllSubCategories,
  getSubCategoryById,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  getSubCategoriesByCategoryId,
  addCustomField,
  updateCustomField,
  removeCustomField,
  getCustomFields,
} = require("../services/subCategoryService");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

// Basic CRUD routes
router
  .route("/")
  .get(protect, restrictTo("admin", "driver"), getAllSubCategories)
  .post(protect, restrictTo("admin"), createSubCategory);

router
  .route("/:id")
  .get(protect, restrictTo("admin", "driver"), getSubCategoryById)
  .put(protect, restrictTo("admin"), updateSubCategory)
  .delete(protect, restrictTo("admin"), deleteSubCategory);

// Get subcategories by category
router
  .route("/category/:categoryId")
  .get(protect, restrictTo("admin", "driver"), getSubCategoriesByCategoryId);

// Custom fields management routes
router
  .route("/:id/fields")
  .get(protect, restrictTo("admin", "driver"), getCustomFields)
  .post(protect, restrictTo("admin"), addCustomField);

router
  .route("/:id/fields/:fieldId")
  .put(protect, restrictTo("admin"), updateCustomField)
  .delete(protect, restrictTo("admin"), removeCustomField);

module.exports = router;
