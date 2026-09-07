import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";

export async function clearDatabase() {
  // Safety guard against wiping production/Neon
  if (process.env.DATABASE_URL.includes("neon.tech")) {
    throw new Error("Test runned is connected to Neon DB");
  }

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "User", "Conversation", "ConversationMember", "Message", "Attachment", "MessageStatus", "MessageReaction", "Block" CASCADE;`,
  );
}

export async function createTestUsers() {
  const agentA = request.agent(app);
  const agentB = request.agent(app);
  const agentC = request.agent(app);

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
