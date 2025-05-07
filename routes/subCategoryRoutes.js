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

router.route("/").get(getAllSubCategories).post(createSubCategory);

router
  .route("/:id")
  .get(getSubCategoryById)
  .put(updateSubCategory)
  .delete(deleteSubCategory);

router.route("/category/:categoryId").get(getSubCategoriesByCategoryId);

module.exports = router;
