import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { clearDatabase, createTestUsers } from "./helpers.js";

describe("2. Conversations and Members", () => {
  let userA, userB, userC;
  let groupConvId;

  beforeAll(async () => {
    await clearDatabase();
    const users = await createTestUsers();
    userA = users.userA;
    userB = users.userB;
    userC = users.userC;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("POST /conversations -> should fail creating GROUP conversation without group name", async () => {
    const res = await request(app)
      .post("/api/v1/conversations")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({
        type: "GROUP",
        memberIds: [userB.id],
      });

    expect(res.status).toBe(400);
  });

  it("POST /conversations -> should create a DIRECT conversation between A and B", async () => {
    const res = await request(app)
      .post("/api/v1/conversations")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({
        type: "DIRECT",
        memberIds: [userB.id],
      });

    expect(res.status).toBe(201);
    expect(res.body.type).toBe("DIRECT");
  });

  it("POST /conversations -> should create a GROUP conversation with A as ADMIN", async () => {
    const res = await request(app)
      .post("/api/v1/conversations")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({
        type: "GROUP",
        name: "Engineering Team",
        memberIds: [userB.id],
      });

    expect(res.status).toBe(201);
    groupConvId = res.body.id;

    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: groupConvId,
          userId: userA.id,
        },
      },
    });
    expect(member.role).toBe("ADMIN");
  });

  it("POST /conversations/:id/members -> should deny non admin (User B) from adding members", async () => {
    const res = await request(app)
      .post(`/api/v1/conversations/${groupConvId}/members`)
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ memberIds: [userC.id] });

    expect(res.status).toBe(403);
  });

  it("POST /conversations/:id/members -> should allow Admin (User A) to add User C", async () => {
    const res = await request(app)
      .post(`/api/v1/conversations/${groupConvId}/members`)
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ memberIds: [userC.id] });

    expect(res.status).toBe(200);
  });

  it("PATCH /conversations/:id/members/:userId -> should promote User B to ADMIN", async () => {
    const res = await request(app)
      .patch(`/api/v1/conversations/${groupConvId}/members/${userB.id}`)
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ role: "ADMIN" });

    expect(res.status).toBe(200);

    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: groupConvId,
          userId: userB.id,
        },
      },
    });
    expect(member.role).toBe("ADMIN");
  });
});
