const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const hpp = require("hpp");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./middleware/globalErrorHandler");

// --- ROUTE IMPORTS ---
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const pharmacyRoutes = require("./routes/pharmacyRoutes");
const medicineRoutes = require("./routes/medicineRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");

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

module.exports = app;
