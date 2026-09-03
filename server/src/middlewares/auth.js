import { verifyToken } from "../utils/jwt.js";

/**
 * Fast, stateless authentication using HTTP only cookie.
 * Runs on protected routes without making database queries.
 */
export const authenticate = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      status: "fail",
      message: "Authentication required",
    });
  }

  try {
    const decoded = verifyToken(token);

    // Attach minimal identity payload to req.user (matches generateToken({ userId }))
    req.user = {
      id: decoded.userId,
    };

    return next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({
        status: "fail",
        message: "Invalid or expired session token",
      });
    }

    // Pass unexpected operational/runtime errors to global handler in app.js
    next(err);
  }
};
