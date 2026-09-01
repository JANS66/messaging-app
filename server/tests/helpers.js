import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/prismaClient.js";

export async function clearDatabase() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "User", "Conversation", "ConversationMember", "Message", "Attachment", "MessageStatus", "MessageReaction", "Block" CASCADE;`,
  );
}

export async function createTestUsers() {
  // Register Users
  const userA = await request(app).post("/api/v1/auth/register").send({
    username: "user_alpha",
    email: "alpha@example.com",
    password: "Password123!",
  });

  const userB = await request(app).post("/api/v1/auth/register").send({
    username: "user_beta",
    email: "beta@example.com",
    password: "Password123!",
  });

  const userC = await request(app).post("/api/v1/auth/register").send({
    username: "user_charlie",
    email: "charlie@example.com",
    password: "Password123!",
  });

  // Login Users
  const loginA = await request(app).post("/api/v1/auth/login").send({
    email: "alpha@example.com",
    password: "Password123!",
  });

  const loginB = await request(app).post("/api/v1/auth/login").send({
    email: "charlie@example.com",
    password: "Password123!",
  });

  return {
    userA: { id: userA.body.user.id, token: loginA.body.token },
    userB: { id: userB.body.user.id, token: loginB.body.token },
    userC: { id: userC.body.user.id, token: loginC.body.token },
  };
}
