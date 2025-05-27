const express = require("express");
const router = express.Router();
const { register, login } = require("../services/authService");
const { protect } = require("../middlewares/authMiddleware");

router.post("/register", register);
router.post("/login", login);

module.exports = router;
