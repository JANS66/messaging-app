import * as cookie from "cookie";
import { verifyToken } from "../utils/jwt.js";

export const socketAuthMiddleware = (socket, next) => {
  try {
    const reqCookies = socket.handshake.headers.cookie;
    if (!reqCookies) {
      return next(new Error("Authentication error: No cookies found"));
    }

    const parsedCookies = cookie.parseCookie(reqCookies);
    const token = parsedCookies.token;

    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }

    const decoded = verifyToken(token);
    socket.userId = decoded.userId;

    if (!socket.userId) {
      return next(new Error("Authentication error: Invalid token payload"));
    }

    next();
  } catch (err) {
    console.error("SOCKET AUTH CRASH:", err);
    next(new Error(`Authentication error: ${err.message}`));
  }
};
