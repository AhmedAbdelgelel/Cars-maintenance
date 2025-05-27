const express = require('express');
const router = express.Router();
const { register, login, protect } = require('../services/authService');

router.post('/register', register);
router.post('/login', login);

router.get('/me', protect, (req, res) => {
  res.status(200).json({
    status: 'success',
    data: { driver: req.driver }
  });
});

module.exports = router;