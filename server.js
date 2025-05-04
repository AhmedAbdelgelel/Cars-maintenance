const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./db/connect");
const morgan = require("morgan");
const globalError = require("./middlewares/globalError");
const notFound = require("./middlewares/notFound");
const mountRoutes = require("./routes/mountRoutes");
dotenv.config();

connectDB();

const app = express();

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

app.use(notFound);

app.use(globalError);

const PORT = process.env.PORT ?? 3000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
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
