import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import env from "./config/env.js";
import adminRoutes from "./routes/admin.routes.js";
import appointmentRoutes from "./routes/appointment.routes.js";
import authRoutes from "./routes/auth.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import slotRoutes from "./routes/slot.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import { ApiError } from "./utils/helpers.js";
import { uploadRootDir } from "./utils/uploads.js";

const app = express();

const corsOptions =
  env.corsOrigin === "*"
    ? { origin: "*" }
    : {
        origin: env.corsOrigin.split(",").map((origin) => origin.trim())
      };

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
);

if (env.nodeEnv !== "test") {
  app.use(morgan("combined"));
}

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "Schedulix",
    timestamp: new Date().toISOString()
  });
});

app.get("/favicon.ico", (_req, res) => {
  res.status(204).end();
});

app.use("/auth", authRoutes);
app.use("/appointments", appointmentRoutes);
app.use("/bookings", bookingRoutes);
app.use("/slots", slotRoutes);
app.use("/admin", adminRoutes);
app.use("/profile", profileRoutes);
app.use("/uploads", express.static(uploadRootDir));
app.use("/uploads", uploadRoutes);

app.use((_req, _res, next) => {
  next(new ApiError(404, "Route not found."));
});

app.use((error, _req, res, _next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error.";
  let details = error.details;

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed.";
    details = Object.values(error.errors).map((item) => item.message);
  }

  if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid identifier.";
  }

  if (error.code === 11000) {
    statusCode = 409;
    message = "Duplicate value.";
    details = error.keyValue;
  }

  const shouldLog =
    env.nodeEnv !== "test" && (statusCode >= 500 || !error.isOperational);

  if (shouldLog) {
    console.error(error);
  }

  res.status(statusCode).json({
    error: {
      message,
      details,
      ...(env.nodeEnv === "production" ? {} : { stack: error.stack })
    }
  });
});

export default app;
