const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const ApiError = require("../utils/apiError");
const Car = require("../models/carsModel");

exports.analyzeMeterImage = async (req, res, next) => {
  if (!req.file) {
    return next(new ApiError("Please upload an image file", 400));
  }
  try {
    const driver = req.driver;
    let car = null;

    if (!driver) {
      return next(
        new ApiError("No driver found. Authentication required", 401)
      );
    }

    if (!driver.car) {
      return next(new ApiError("No car is assigned to this driver", 400));
    }

    car = await Car.findById(driver.car);

    if (!car) {
      return next(new ApiError("The assigned car could not be found", 404));
    }
    const result = await analyzeImage(req.file.path);

    const meterReading = extractMeterReading(result);

    // Determine what reading to save - either explicitly selected or auto-detected
    let readingToSave;

    if (req.body.selectedReading) {
      // If user explicitly selects a reading, use that
      readingToSave = Number(req.body.selectedReading);
    } else if (
      meterReading.possibleReadings &&
      meterReading.possibleReadings.length > 0
    ) {
      // Auto-select the first (usually largest) number if no selection was made
      // Sort readings by numeric value to find the largest one (likely the odometer)
      const sortedReadings = [...meterReading.possibleReadings].sort(
        (a, b) => Number(b.value) - Number(a.value)
      );

      // Get the first (largest) reading that's likely to be an odometer
      const likelyOdometer = sortedReadings.find((r) => Number(r.value) > 1000);

      if (likelyOdometer) {
        readingToSave = Number(likelyOdometer.value);
      }
    }

    // Only save if we have a valid reading to save
    if (readingToSave) {
      const currentDate = new Date();

      car.meterReading = readingToSave;
      car.lastMeterUpdate = currentDate;
      await car.save();

      // Update driver meter reading (only carMeter)
      driver.carMeter = {
        reading: readingToSave,
        updateDate: currentDate,
      };
      await driver.save();
    }
    res.status(200).json({
      status: "success",
      data: {
        meterReading,
        imagePath: `/${req.file.path}`,
        driverId: driver._id,
        carId: car._id,
        savedReading: readingToSave || null,
      },
    });
  } catch (error) {
    return next(new ApiError(`Failed to analyze image: ${error.message}`, 500));
  }
};

exports.updateDriverMeterReading = async (req, res, next) => {
  const { meterReading } = req.body;
  const currentDate = new Date();

  try {
    const driver = req.driver;

    if (!driver) {
      return next(
        new ApiError("No driver found. Authentication required", 401)
      );
    }

    if (!driver.car) {
      return next(new ApiError("No car is assigned to this driver", 400));
    }

    const car = await Car.findById(driver.car);

    if (!car) {
      return next(new ApiError("The assigned car could not be found", 404));
    }

    // Update car meter reading
    car.meterReading = meterReading;
    car.lastMeterUpdate = currentDate;
    await car.save();

    // Update driver meter reading (only carMeter)
    driver.carMeter = {
      reading: meterReading,
      updateDate: currentDate,
    };
    await driver.save();

    res.status(200).json({
      status: "success",
      message: "Car meter reading updated successfully",
      data: {
        driver,
      },
    });
  } catch (error) {
    return next(
      new ApiError(`Failed to update meter reading: ${error.message}`, 500)
    );
  }
};

async function analyzeImage(imagePath) {
  const readEndpoint = `${process.env.AZURE_VISION_ENDPOINT}vision/v3.2/read/analyze`;

  const formData = new FormData();
  formData.append("file", fs.createReadStream(imagePath));

  const response = await axios.post(readEndpoint, formData, {
    headers: {
      "Ocp-Apim-Subscription-Key": process.env.AZURE_VISION_KEY,
      ...formData.getHeaders(),
    },
  });

  const operationLocation = response.headers["operation-location"];

  let result;
  let status = "running";
  while (status !== "succeeded" && status !== "failed") {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const resultResponse = await axios.get(operationLocation, {
      headers: {
        "Ocp-Apim-Subscription-Key": process.env.AZURE_VISION_KEY,
      },
    });

    status = resultResponse.data.status;
    if (status === "succeeded") {
      result = resultResponse.data;
    }
  }

  if (status === "failed") {
    throw new Error("Azure Vision API analysis failed");
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
    rawText: allText.join("\n"),
    possibleReadings: [],
  };

  const numberPattern = /\d+(\.\d+)?/g;
  let match;

  allText.forEach((text) => {
    numberPattern.lastIndex = 0;

    while ((match = numberPattern.exec(text)) !== null) {
      meterData.possibleReadings.push({
        value: match[0],
        context: text,
      });
    }
  });

  return meterData;
}
