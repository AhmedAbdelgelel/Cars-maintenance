const carRoutes = require("./carRoutes");
const maintenanceRoutes = require("./maintenanceRoutes");
const categoryRoutes = require("./categoryRoutes");
const subCategoryRoutes = require("./subCategoryRoutes");
const driverRoutes = require("./driverRoutes");
const carMeterRoutes = require("./carMeterRoutes");

const mountRoutes = (app) => {
  app.use("/api/cars", carRoutes);
  app.use("/api/maintenance", maintenanceRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/subcategories", subCategoryRoutes);
  app.use("/api/drivers", driverRoutes);
  app.use("/api/car-meter", carMeterRoutes);
};

module.exports = mountRoutes;
