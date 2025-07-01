const carRoutes = require("./carRoutes");
const maintenanceRoutes = require("./maintenanceRoutes");
const maintenanceRequestRoutes = require("./maintenanceRequestRoutes");
const categoryRoutes = require("./categoryRoutes");
const subCategoryRoutes = require("./subCategoryRoutes");
const driverRoutes = require("./driverRoutes");
const receiverRoutes = require("./receiverRoutes");
const notificationRoutes = require("./notificationRoutes");
const carMeterRoutes = require("./carMeterRoutes");
const authRoutes = require("./authRoutes");
const adminRoutes = require("./adminRoutes");

const mountRoutes = (app) => {
  app.use("/api/cars", carRoutes);
  app.use("/api/maintenance", maintenanceRoutes);
  app.use("/api/maintenance-requests", maintenanceRequestRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/subcategories", subCategoryRoutes);
  app.use("/api/drivers", driverRoutes);
  app.use("/api/receivers", receiverRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/car-meter", carMeterRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
};

module.exports = mountRoutes;
