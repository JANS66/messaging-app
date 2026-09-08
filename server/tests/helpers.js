import request from "supertest";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { socketAuthMiddleware } from "../src/sockets/socket.auth.js";

export async function clearDatabase() {
  // Safety guard against wiping production/Neon
  if (process.env.DATABASE_URL.includes("neon.tech")) {
    throw new Error("Test runned is connected to Neon DB");
  }

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "User", "Conversation", "ConversationMember", "Message", "Attachment", "MessageStatus", "MessageReaction", "Block" CASCADE;`,
  );
}

export function setupTestServer(onSetup) {
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*", credentials: true },
  });

  io.use(socketAuthMiddleware);

  // Automatically join the authenticated user into their own room ID
  io.on("connection", (socket) => {
    if (socket.userId) {
      socket.join(socket.userId);
    }
  });

  if (onSetup) {
    onSetup(io);
  }

  // Bind io to Express app instance so req.io works globally
  app.set("io", io);

  return { httpServer, io };
}

export async function createTestUsers(server) {
  const agentA = request.agent(server);
  const agentB = request.agent(server);
  const agentC = request.agent(server);

  // Register Users
  const userA = await agentA.post("/api/v1/auth/register").send({
    username: "user_alpha",
    email: "alpha@example.com",
    password: "Password123!",
  });

  const userB = await agentB.post("/api/v1/auth/register").send({
    username: "user_beta",
    email: "beta@example.com",
    password: "Password123!",
  });

  const userC = await agentC.post("/api/v1/auth/register").send({
    username: "user_charlie",
    email: "charlie@example.com",
    password: "Password123!",
  });

  // Login Users
  const loginA = await agentA.post("/api/v1/auth/login").send({
    email: "alpha@example.com",
    password: "Password123!",
  });

  const loginB = await agentB.post("/api/v1/auth/login").send({
    email: "beta@example.com",
    password: "Password123!",
  });

  const loginC = await agentC.post("/api/v1/auth/login").send({
    email: "charlie@example.com",
    password: "Password123!",
  });

  return {
    userA: { id: userA.body.data.user.id, agent: agentA },
    userB: { id: userB.body.data.user.id, agent: agentB },
    userC: { id: userC.body.data.user.id, agent: agentC },
  };
}
