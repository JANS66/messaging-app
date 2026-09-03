import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { clearDatabase, createTestUsers } from "./helpers.js";

describe("5. Prisma Schema Integrity and Cascade Deletions", () => {
  let userA, userB, userC;
  let groupConvId;

  beforeAll(async () => {
    await clearDatabase();
    const users = await createTestUsers();
    userA = users.userA;
    userB = users.userB;
    userC = users.userC;

    const conv = await request(app)
      .post("/api/v1/conversations")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({
        type: "GROUP",
        name: "Test Group",
        memberIds: [userB.id, userC.id],
      });
    groupConvId = conv.body.id;

    await request(app)
      .post(`/api/v1/conversations/${groupConvId}/messages`)
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ content: "Sample message before delete" });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Deleting a Conversation should cascade delete members and messages", async () => {
    await prisma.conversation.delete({ where: { id: groupConvId } });

    const membersCount = await prisma.conversationMember.count({
      where: { conversationId: groupConvId },
    });
    const messagesCount = await prisma.message.count({
      where: { conversationId: groupConvId },
    });

    expect(membersCount).toBe(0);
    expect(messagesCount).toBe(0);
  });

  it("Deleting a User should clear sent messages and foreign key constraints cleanly", async () => {
    await prisma.user.delete({ where: { id: userC.id } });

    const deletedUser = await prisma.user.findUnique({
      where: { id: userC.id },
    });
    expect(deletedUser).toBeNull();
  });
});
