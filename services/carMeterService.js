const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const ApiError = require('../utils/apiError');
const Car = require('../models/carsModel');


exports.analyzeMeterImage = async (req, res, next) => {
  if (!req.file) {
    return next(new ApiError('Please upload an image file', 400));
  }

  try {
    const driver = req.driver;
    
    if (!driver.car) {
      return next(new ApiError('No car is assigned to this driver', 400));
    }
    
    const car = await Car.findById(driver.car);
    if (!car) {
      return next(new ApiError('The assigned car could not be found', 404));
    }
    
    const result = await analyzeImage(req.file.path);
    const meterReading = extractMeterReading(result);
    
    let bestReading = 0;
    if (meterReading.possibleReadings.length > 0) {
      bestReading = parseInt(meterReading.possibleReadings[0].value, 10);
    }
    
    if (bestReading > 0) {
      if (bestReading > car.meterReading) {
        car.meterReading = bestReading;
        car.lastMeterUpdate = new Date();
        await car.save();
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        meterReading,
        imagePath: `/${req.file.path}`,
        updatedCar: car
      }
    });
  } catch (error) {
    return next(new ApiError(`Failed to analyze image: ${error.message}`, 500));
  }
};

exports.updateCarMeterReading = async (req, res, next) => {
  const { meterReading } = req.body;
  
  if (!meterReading) {
    return next(new ApiError('Meter reading is required', 400));
  }
  
  try {
    const driver = req.driver;
    
    if (!driver.car) {
      return next(new ApiError('No car is assigned to this driver', 400));
    }
    
    const car = await Car.findById(driver.car);
    
    if (!car) {
      return next(new ApiError('The assigned car could not be found', 404));
    }
    
    car.meterReading = meterReading;
    car.lastMeterUpdate = new Date();
    await car.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Car meter reading updated successfully',
      data: {
        car
      }
    });
  } catch (error) {
    return next(new ApiError(`Failed to update car: ${error.message}`, 500));
  }
};

async function analyzeImage(imagePath) {
  const readEndpoint = `${process.env.AZURE_VISION_ENDPOINT}vision/v3.2/read/analyze`;

  const formData = new FormData();
  formData.append('file', fs.createReadStream(imagePath));
  
  const response = await axios.post(readEndpoint, formData, {
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.AZURE_VISION_KEY,
      ...formData.getHeaders()
    }
  });
  
  const operationLocation = response.headers['operation-location'];
  
  let result;
  let status = 'running';
  while (status !== 'succeeded' && status !== 'failed') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const resultResponse = await axios.get(operationLocation, {
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.AZURE_VISION_KEY
      }
    });
    
    status = resultResponse.data.status;
    if (status === 'succeeded') {
      result = resultResponse.data;
    }
  }
  
  if (status === 'failed') {
    throw new Error('Azure Vision API analysis failed');
  }
  
  return result;
}

function extractMeterReading(result) {
  let allText = [];
  
  if (result && result.analyzeResult && result.analyzeResult.readResults) {
    for (const readResult of result.analyzeResult.readResults) {
      for (const line of readResult.lines || []) {
        allText.push(line.text);
      }
    }
  }
  
  const meterData = {
    rawText: allText.join('\n'),
    possibleReadings: []
  };
  
  const numberPattern = /\d+(\.\d+)?/g;
  let match;
  
  allText.forEach(text => {
    numberPattern.lastIndex = 0;
    
    while ((match = numberPattern.exec(text)) !== null) {
      meterData.possibleReadings.push({
        value: match[0],
        context: text
      });
    }
  });
  
  return meterData;
}
