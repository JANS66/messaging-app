import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";

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

// Global Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);

  const statusCode = err.statusCode || 500;
  const status = `${statusCode}`.startsWith("4") ? "fail" : "error";

  res.status(statusCode).json({
    status,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;
