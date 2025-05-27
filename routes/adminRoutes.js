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
const { protect } = require("../middlewares/authMiddleware");
router.post("/register", register);
router.post("/login", login);
router.use(protect);
router.use((req, res, next) => {
  if (!req.admin) {
    return res.status(403).json({
      status: "error",
      message: "You do not have permission to perform this action",
    });
  }
  next();
});
router.get("/", getAllAdmins);
router.get("/:id", getAdminById);
router.put("/:id", updateAdmin);
router.delete("/:id", deleteAdmin);
module.exports = router;
