const express = require("express");
const router = express.Router();
const { register, login, logout, deleteAccount } = require("../services/authService");
const { protect } = require("../middlewares/authMiddleware");


router.post("/register", register);
router.post("/login", login);
router.post("/logout", protect, logout);
router.delete("/delete-account", protect, deleteAccount);

module.exports = router;
