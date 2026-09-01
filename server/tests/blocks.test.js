import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/prismaClient.js";
import { clearDatabase, createTestUsers } from "./helpers.js";

describe("4. User Blocking Flow", () => {
  let userA, userB;
  let directConvId;

  beforeAll(async () => {
    await clearDatabase();
    const users = await createTestUsers();
    userA = users.userA;
    userB = users.userB;

    const conv = await request(app)
      .post("/api/v1/conversations")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({
        type: "DIRECT",
        memberIds: [userB.id],
      });
    directConvId = conv.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("POST /blocks -> User A blocks User B", async () => {
    const res = await request(app)
      .post("/api/v1/blocks")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ blockedId: userB.id });

    expect(res.status).toBe(201);
  });

  it("POST /conversations/:id/messages -> should prevent blocked communication in 1 on 1 chat", async () => {
    const res = await request(app)
      .post(`/api/v1/conversations/${directConvId}/messages`)
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ content: "Are you blocking me?" });

    expect(res.status).toBe(403);
  });

  it("DELETE /block/:blockedId -> User A unblocks User B", async () => {
    const res = await request(app)
      .delete(`/api/v1/blocks/${userB.id}`)
      .set("Authorization", `Bearer ${userA.token}`);

    expect(res.status).toBe(200);
  });
});
