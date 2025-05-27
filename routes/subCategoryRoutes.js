const express = require("express");
const router = express.Router();
const {
  getAllSubCategories,
  getSubCategoryById,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  getSubCategoriesByCategoryId,
} = require("../services/subCategoryService");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

router
  .route("/")
  .get(protect, restrictTo("admin", "driver"), getAllSubCategories)

  .post(protect, restrictTo("admin"), createSubCategory);

router
  .route("/:id")

  .get(protect, restrictTo("admin", "driver"), getSubCategoryById)

  .put(protect, restrictTo("admin"), updateSubCategory)
  .delete(protect, restrictTo("admin"), deleteSubCategory);

router
  .route("/category/:categoryId")
  .get(protect, restrictTo("admin", "driver"), getSubCategoriesByCategoryId);

module.exports = router;
