const express = require("express");
const { protect, restrictTo } = require("../middlewares/authMiddleware");
const router = express.Router();
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../services/categoryService");
router
  .route("/")
  .get(protect, restrictTo("admin", "driver", "accountant"), getAllCategories)
  .post(protect, restrictTo("admin"), createCategory);
router
  .route("/:id")
  .get(protect, restrictTo("admin", "driver", "accountant"), getCategoryById)
  .put(protect, restrictTo("admin"), updateCategory)
  .delete(protect, restrictTo("admin"), deleteCategory);
module.exports = router;
