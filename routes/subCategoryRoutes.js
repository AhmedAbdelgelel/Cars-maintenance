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
  .get(
    protect,
    restrictTo("admin", "driver", "accountant"),
    getAllSubCategories
  )
  .post(protect, restrictTo("admin", "accountant"), createSubCategory);

router
  .route("/:id")
  .get(protect, restrictTo("admin", "driver", "accountant"), getSubCategoryById)
  .put(protect, restrictTo("admin", "accountant"), updateSubCategory)
  .delete(protect, restrictTo("admin"), deleteSubCategory);

// Get subcategories by category
router
  .route("/category/:categoryId")
  .get(
    protect,
    restrictTo("admin", "driver", "accountant"),
    getSubCategoriesByCategoryId
  );

// Custom fields management routes
router
  .route("/:id/fields")
  .get(protect, restrictTo("admin", "driver", "accountant"), getCustomFields)
  .post(protect, restrictTo("admin", "accountant"), addCustomField);

router
  .route("/:id/fields/:fieldId")
  .put(protect, restrictTo("admin", "accountant"), updateCustomField)
  .delete(protect, restrictTo("admin", "accountant"), removeCustomField);

module.exports = router;
