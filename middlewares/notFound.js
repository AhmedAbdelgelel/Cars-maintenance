const ApiError = require("../utils/apiError");
const notFound = (req, res, next) => {
  next(new ApiError(`Can't find ${req.originalUrl} on this server`, 404));
};
module.exports = notFound;
