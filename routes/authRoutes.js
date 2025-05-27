const express = require("express");
const router = express.Router();
const { register, login, getMe } = require("../services/authService");
const { protect } = require("../middlewares/authMiddleware");

router.post("/register", register);
router.post("/login", login);

router.get("/me", protect, getMe);

module.exports = router;
