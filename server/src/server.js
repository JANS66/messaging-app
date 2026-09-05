import app from "./app.js";
import { setupPresenceHandlers } from "./sockets/presence.js";
import { socketAuthMiddleware } from "./sockets/socket.auth.js";
import http from "http";
import { Server } from "socket.io";
import { prisma } from "./config/db.js";

const PORT = process.env.PORT || 3000;

// Create HTTP server from Express app first
const server = http.createServer(app);

// Initialize Socket.IO with the HTTP server instance
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  },
});

io.use(socketAuthMiddleware);
setupPresenceHandlers(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Reset online flags on server restart/shutdown to clear stale states
const cleanupPresenceOnShutdown = async () => {
  try {
    await prisma.user.updateMany({
      where: { isOnline: true },
      data: { isOnline: false, lastSeen: new Date() },
    });
  } catch (err) {
    console.error("Error resetting user presence on shutdown:", err);
  } finally {
    process.exit(0);
  }
};

process.on("SIGINT", cleanupPresenceOnShutdown);
process.on("SIGTERM", cleanupPresenceOnShutdown);

// Graceful Shutdown
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection, shutting down.", err);
  server.close(() => {
    process.exit(1);
  });
});
