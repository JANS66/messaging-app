import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import multer from "multer";

const app = express();

// Security HTTP Headers
app.use(helmet());

// Cookie Parser Middleware (Required to read req.cookies)
app.use(cookieParser());

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true, // Crucial: Allows browser to send and receive http only cookies
  }),
);

// Request body parsing
app.use(express.json({ limit: "10kb" })); // Defends against payload flooding

// Mount API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);

// Handle Unhandled Routes (404)
app.use((req, res, next) => {
  res.status(404).json({
    status: "fail",
    message: `Cannot find ${req.originalUrl} on this server.`,
  });
});

// Map built in Multer codes to user friendly messages
const MULTER_ERROR_MESSAGES = {
  LIMIT_FILE_SIZE: "File size exceeds the 5MB limit.",
  LIMIT_FILE_COUNT: "Too many files uploaded.",
  LIMIT_UNEXPECTED_FILE: "Unexpected field name in form upload.",
  LIMIT_PART_COUNT: "Too many parts in form upload.",
};

// Global Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  // Handle native Multer errors
  if (err instanceof multer.MulterError) {
    const message = MULTER_ERROR_MESSAGES[err.code] || err.message;

    return res.status(400).json({
      status: "fail",
      message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }

  // 2. Handle non Multer operational and system errors
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test"
  ) {
    console.error("Unhandled Error Log:", err);
  }

  const statusCode = err.statusCode || 500;
  const status = `${statusCode}`.startsWith("4") ? "fail" : "error";

  return res.status(statusCode).json({
    status,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;
