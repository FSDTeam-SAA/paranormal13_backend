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

// Import the single main router
import routes from "./routes/index.js";

const app = express();

// --- GLOBAL MIDDLEWARES ---

// 1) GLOBAL CORS
app.use(cors({ origin: true, credentials: true }));
app.options("*", cors());

// 2) Security HTTP headers
app.use(helmet());

// 3) Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// 4) Limit requests
const limiter = rateLimit({
  max: 1000,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api", limiter);

// 5) Body parser
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// 6) Data sanitization
app.use(mongoSanitize());

// 7) XSS Protection
app.use(xss());

// 8) Prevent parameter pollution
app.use(hpp());

// --- MOUNT ROUTES ---
// This one line handles everything!
// e.g. /api/auth, /api/users, etc.
app.use("/api", routes);

// Base route
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
