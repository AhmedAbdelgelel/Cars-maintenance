const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
} = require("../services/adminService");

const { protect, restrictTo } = require("../middlewares/authMiddleware");

router.post("/register", register);
router.post("/login", login);

router.use(protect, restrictTo("admin"));

router.get("/", getAllAdmins);
router.get("/:id", getAdminById);
router.put("/:id", updateAdmin);
router.delete("/:id", deleteAdmin);

module.exports = router;
