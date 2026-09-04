import { verifyToken } from "../utils/jwt.js";
import { clearAuthCookie } from "../utils/jwt.js";
import { prisma } from "../config/db.js";

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

/**
 * DB Check Middleware: Verifies the account still exists in PostgreSQL.
 * Attached ONLY to critical routes
 */
export const verifyActiveUser = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        avatarPublicId: true,
        status: true,
        isOnline: true,
      },
    });

    if (!user) {
      // Clear invalid cookie if user was deleted
      clearAuthCookie(res);
      return res.status(401).json({
        status: "fail",
        message: "User account no longer exists",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
