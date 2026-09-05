import { prisma } from "../config/db.js";

// IN memory set of connected sockets per user: userId -> Set(socketId)
const activeUsers = new Map();

export const setupPresenceHandlers = (io) => {
  io.on("connection", async (socket) => {
    const userId = socket.userId;

    // Initialize Set for this user if not present
    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, new Set());
    }
    const userSockets = activeUsers.get(userId);
    userSockets.add(socket.id);

    // Mark online in DB ONLY on the FIRST connected tab/device
    if (userSockets.size === 1) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { isOnline: true },
        });

        io.emit("user_presence_change", {
          userId,
          isOnline: true,
        });
      } catch (err) {
        console.error(`Failed to set user ${userId} online:`, err);
      }
    }

    // Handle socket disconnection
    socket.on("disconnect", async () => {
      const currentSockets = activeUsers.get(userId);

      if (currentSockets) {
        currentSockets.delete(socket.id);

        // Mark offline in DB ONLY when the LAST tab/device disconnects
        if (currentSockets.size === 0) {
          activeUsers.delete(userId);

          try {
            const lastSeen = new Date();
            await prisma.user.update({
              where: { id: userId },
              data: {
                isOnline: false,
                lastSeen,
              },
            });

            io.emit("user_presence_change", {
              userId,
              isOnline: false,
              lastSeen,
            });
          } catch (err) {
            console.error(`Failed to set user ${userId} offline:`, err);
          }
        }
      }
    });
  });
};
