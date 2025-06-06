const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./db/connect");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");
const globalError = require("./middlewares/globalError");
const notFound = require("./middlewares/notFound");
const mountRoutes = require("./routes/mountRoutes");
dotenv.config();
connectDB();
const app = express();
app.use(
  cors({
    origin: function (origin, callback) {
      callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`mode: ${process.env.NODE_ENV}`);
}
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
  })
);
mountRoutes(app);
app.use(notFound);
app.use(globalError);
const PORT = process.env.PORT ?? 3000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(
    `API Documentation available at http://localhost:${PORT}/api/docs or http://srv830738.hstgr.cloud/api/docs`
  );
});
process.on("unhandledRejection", (err) => {
  console.log("Unhandled Rejection at:", err.stack || err);
  server.close(() => {
    process.exit(1);
  });
});
process.on("uncaughtException", (err) => {
  console.log("Uncaught Exception thrown:", err.stack || err);
  server.close(() => {
    process.exit(1);
  });
});
