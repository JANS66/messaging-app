import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { clearDatabase } from "./helpers.js";

describe("1. Auth and User Management", () => {
  let userAToken;

  beforeAll(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("POST /auth/register -> should fail with invalid payload (schema check)", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      username: "user@invalid!",
      email: "not-an-email",
      password: "short",
    });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it("POST /auth/register -> should successfully create User A, User B, and User C", async () => {
    const userA = await request(app).post("/api/v1/auth/register").send({
      username: "user_alpha",
      email: "alpha@example.com",
      password: "Password123!",
    });
    expect(userA.status).toBe(201);

    const userB = await request(app).post("/api/v1/auth/register").send({
      username: "user_beta",
      email: "beta@example.com",
      password: "Password123!",
    });
    expect(userB.status).toBe(201);

    const userC = await request(app).post("/api/v1/auth/register").send({
      username: "user_charlie",
      email: "charlie@example.com",
      password: "Password123!",
    });
    expect(userC.status).toBe(201);
  });

  it("POST /auth/login -> should authenticate and return JWT token", async () => {
    const resA = await request(app).post("/api/v1/auth/login").send({
      email: "alpha@example.com",
      password: "Password123!",
    });
    expect(resA.status).toBe(200);
    userAToken = resA.body.token;
  });

  it("GET /users/me -> should return profile of authenticated user", async () => {
    const res = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.username).toBe("user_alpha");
  });

  it("PATCH /users/me/presence -> should update online status", async () => {
    const res = await request(app)
      .patch("/api/v1/users/me/presence")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ isOnline: true, status: "Coding tests..." });

    expect(res.status).toBe(200);
    expect(res.body.isOnline).toBe(true);
    expect(res.body.status).toBe("Coding tests...");
  });

  it("GET /users/search?q=beta -> should find User B", async () => {
    const res = await request(app)
      .get("/api/v1/users/search?q=beta")
      .set("Authorization", `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].username).toBe("user_beta");
  });
});
