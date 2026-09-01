import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/prismaClient.js";
import { clearDatabase, createTestUsers } from "./helpers.js";

describe("3. Messages and Attachments", () => {
  let userA, userB, userC;
  let groupConvId;
  let testMessageId;

  beforeAll(async () => {
    await clearDatabase();
    const users = await createTestUsers();
    userA = users.userA;
    userB = users.userB;
    userC = users.userC;

    // Set up initial conversation
    const conv = await request(app)
      .post("/api/v1/conversations")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({
        type: "GROUP",
        name: "Dev Chat",
        memberIds: [userB.id, userC.id],
      });
    groupConvId = conv.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("POST /conversations/:id/messages -> should reject empty message without attachments", async () => {
    const res = await request(app)
      .post(`/api/v1/conversations/${groupConvId}/messages`)
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ type: "TEXT", content: "   " });

    expect(res.status).toBe(400);
  });

  it("POST /conversations/:id/messages -> should reject non member (unauthorized)", async () => {
    await prisma.conversationMember.delete({
      where: {
        conversationId_userId: {
          conversationId: groupConvId,
          userId: userC.id,
        },
      },
    });

    const res = await request(app)
      .post(`/api/v1/conversations/${groupConvId}/messages`)
      .set("Authorization", `Bearer ${userC.token}`)
      .send({ content: "Unauthorized message" });

    expect(res.status).toBe(403);

    await prisma.conversationMember.create({
      data: { conversationId: groupConvId, userId: userC.id, role: "MEMBER" },
    });
  });

  it("POST /conversations/:id/messages -> should send message with attachment and update lastMessageId", async () => {
    const res = await request(app)
      .post(`/api/v1/conversations/${groupConvId}/messages`)
      .set("Authorization", `Bearer ${userA.token}`)
      .send({
        content: "Hello Team! Check this document.",
        type: "FILE",
        attachments: [
          {
            url: "https://storage.example.com/spec.pdf",
            fileType: "application/pdf",
            fileSize: 2048576,
          },
        ],
      });

    expect(res.status).toBe(201);
    testMessageId = res.body.id;

    const conv = await prisma.conversation.findUnique({
      where: { id: groupConvId },
    });
    expect(conv.lastMessageId).toBe(testMessageId);
  });

  it("GET /conversations/:id/messages -> should return paginated messages", async () => {
    const res = await request(app)
      .get(`/api/v1/conversations/${groupConvId}/messages?limit=10`)
      .set("Authorization", `Bearer ${userB.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].attachments.length).toBe(1);
  });

  it("POST /messages/:messageId/reactions -> should allow emoji reactions", async () => {
    const res = await request(app)
      .post(`/api/v1/messages/${testMessageId}/reactions`)
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ emoji: "👍" });

    expect(res.status).toBe(201);
  });

  it("POST /messages/:messageId/status -> should set message read status", async () => {
    const res = await request(app)
      .post(`/api/v1/messages/${testMessageId}/status`)
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ status: "READ" });

    expect(res.status).toBe(200);
  });

  it("DELETE /messages/:messageId -> soft deletes message and clears content", async () => {
    const res = await request(app)
      .delete(`/api/v1/messages/${testMessageId}`)
      .set("Authorization", `Beaer ${userA.token}`);

    expect(res.status).toBe(200);

    const dbMsg = await prisma.message.findUnique({
      where: { id: testMessageId },
    });
    expect(dbMsg.isDeleted).toBe(true);
    expect(dbMsg.content).toBeNull();
  });
});
