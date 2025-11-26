import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import cors from "cors";
import cookieParser from "cookie-parser";
import hpp from "hpp";

import AppError from "./utils/appError.js";
import globalErrorHandler from "./middleware/globalErrorHandler.js";

// --- ROUTE IMPORTS ---
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import pharmacyRoutes from "./routes/pharmacyRoutes.js";
import medicineRoutes from "./routes/medicineRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();

// --- GLOBAL MIDDLEWARES ---

// 1) GLOBAL CORS (Allow everyone for now to avoid frontend headaches during dev)
app.use(cors({ origin: true, credentials: true }));
app.options("*", cors());

// 2) Security HTTP headers
app.use(helmet());

// 3) Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// 4) Limit requests from same API
const limiter = rateLimit({
  max: 1000,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api", limiter);

// 5) Body parser, reading data from body into req.body
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// 6) Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// 7) Data sanitization against XSS
app.use(xss());

// 8) Prevent parameter pollution
app.use(hpp());

// --- ROUTES MOUNTING ---
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/pharmacies", pharmacyRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

// Base route for testing status
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "MediRemind API is running",
  });
});

// --- ERROR HANDLING ---

// 404 - Handle Undefined Routes
app.all("*", (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

export default app;
