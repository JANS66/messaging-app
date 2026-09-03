import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { clearDatabase } from "./helpers.js";

describe("1. Auth and User Management", () => {
  // Agent automatically persists and sends cookies across requests
  const agent = request.agent(app);

  beforeAll(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("POST /auth/register -> should fail with invalid payload (schema check)", async () => {
    const res = await agent.post("/api/v1/auth/register").send({
      username: "user@invalid!",
      email: "not-an-email",
      password: "short",
    });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it("POST /auth/register -> should successfully create User A, User B, and User C", async () => {
    const userA = await agent.post("/api/v1/auth/register").send({
      username: "user_alpha",
      email: "alpha@example.com",
      password: "Password123!",
    });
    expect(userA.status).toBe(201);

    const userB = await agent.post("/api/v1/auth/register").send({
      username: "user_beta",
      email: "beta@example.com",
      password: "Password123!",
    });
    expect(userB.status).toBe(201);

    const userC = await agent.post("/api/v1/auth/register").send({
      username: "user_charlie",
      email: "charlie@example.com",
      password: "Password123!",
    });
    expect(userC.status).toBe(201);
  });

  it("POST /auth/login -> should authenticate and store HTTP-only cookie in agent", async () => {
    const res = await agent.post("/api/v1/auth/login").send({
      email: "alpha@example.com",
      password: "Password123!",
    });
    expect(res.status).toBe(200);

    // Verify Set-Cookie header exists on response
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes("token="))).toBe(true);
  });

  it("GET /users/me -> should return profile of authenticated user", async () => {
    const res = await agent.get("/api/v1/users/me");

    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe("user_alpha");
  });

  it("PATCH /users/me/presence -> should update online status", async () => {
    const res = await agent
      .patch("/api/v1/users/me/presence")
      .send({ isOnline: true, status: "Coding tests..." });

    expect(res.status).toBe(200);
    expect(res.body.isOnline).toBe(true);
    expect(res.body.status).toBe("Coding tests...");
  });

  it("GET /users/search?q=beta -> should find User B", async () => {
    const res = await agent.get("/api/v1/users/search?q=beta");

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].username).toBe("user_beta");
  });

  it("POST /auth/logout -> should clear auth cookie and return 200", async () => {
    const res = await agent.post("/api/v1/auth/logout");

    expect(res.status).toBe(200);

    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();

    const tokenCookie = cookies.find((c) => c.includes("token="));
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0|token=;/);
  });

  it("GET /users/me -> should fail with 401 after logging out", async () => {
    const res = await agent.get("/api/v1/users/me");
    expect(res.status).toBe(401);
  });
});
