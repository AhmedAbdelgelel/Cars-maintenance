const express = require('express');
const router = express.Router();
const {
  register,
  login,
  protect,
  restrictToAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin
} = require('../services/adminService');

// Authentication routes
router.post('/register', register);
router.post('/login', login);

// Protected routes - require admin authentication
router.use(protect);
router.use(restrictToAdmin);

// Admin management routes
router.get('/', getAllAdmins);
router.get('/:id', getAdminById);
router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);

module.exports = router;