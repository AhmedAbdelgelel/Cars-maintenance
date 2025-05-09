const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const {
  analyzeMeterImage,
  updateCarMeterReading
} = require('../services/carMeterService');

router.post('/analyze', upload.single('meterImage'), analyzeMeterImage);

router.post('/update-reading', updateCarMeterReading);

module.exports = router;