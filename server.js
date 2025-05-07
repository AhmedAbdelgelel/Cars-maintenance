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

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`mode: ${process.env.NODE_ENV}`);
}

// Swagger documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
  })
);

// Mount Routes
mountRoutes(app);

// Error handling
app.use(notFound);
app.use(globalError);

const PORT = process.env.PORT ?? 3000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(
    `API Documentation available at http://localhost:${PORT}/api-docs`
  );
});

server.on("unhandledRejection", (err) => {
  console.log("Unhandled Rejection at:", err.stack || err);
  server.close(() => {
    process.exit(1);
  });
});

server.on("uncaughtException", (err) => {
  console.log("Uncaught Exception thrown:", err.stack || err);
  server.close(() => {
    process.exit(1);
  });
});
