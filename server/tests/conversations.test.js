import { prisma } from "../src/config/db.js";
import { clearDatabase, createTestUsers, setupTestServer } from "./helpers.js";
import { io as ioClient } from "socket.io-client";

describe("2. Conversations and Members", () => {
  let userA, userB, userC;
  let groupConvId;
  let httpServer, PORT;

  beforeAll(async () => {
    await clearDatabase();

    const serverSetup = setupTestServer();
    httpServer = serverSetup.httpServer;

    await new Promise((resolve) => httpServer.listen(0, resolve));
    PORT = httpServer.address().port;

    const users = await createTestUsers(httpServer);
    userA = users.userA;
    userB = users.userB;
    userC = users.userC;
  });

  afterAll(async () => {
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
    await prisma.$disconnect();
  });

  it("POST /conversations -> should fail creating GROUP conversation without group name", async () => {
    const res = await userA.agent.post("/api/v1/conversations").send({
      type: "GROUP",
      memberIds: [userB.id],
    });

    expect(res.status).toBe(400);
  });

  it("POST /conversations -> should create a DIRECT conversation between A and B", async () => {
    const res = await userA.agent.post("/api/v1/conversations").send({
      type: "DIRECT",
      memberIds: [userB.id],
    });

    expect(res.status).toBe(201);
    expect(res.body.data.conversation.type).toBe("DIRECT");
  });

  it("POST /conversations -> should create a GROUP conversation with A as ADMIN", async () => {
    const res = await userA.agent.post("/api/v1/conversations").send({
      type: "GROUP",
      name: "Engineering Team",
      memberIds: [userB.id],
    });

    expect(res.status).toBe(201);
    groupConvId = res.body.data.conversation.id;

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

  it("Socket.io -> should emit conversation_created event to other members", async () => {
    // Connect a client socker for User B using their login session cookie
    const loginRes = await userB.agent.post("/api/v1/auth/login").send({
      email: "beta@example.com",
      password: "Password123!",
    });

    const cookieHeader = loginRes.headers["set-cookie"].find((c) =>
      c.startsWith("token="),
    );

    const clientSocket = ioClient(`http://localhost:${PORT}`, {
      extraHeaders: { cookie: cookieHeader },
    });

    await new Promise((resolve, reject) => {
      clientSocket.on("connect", resolve);
      clientSocket.on("connect_error", reject);
    });

    const eventPromise = new Promise((resolve) => {
      clientSocket.on("conversation_created", (data) => {
        resolve(data);
      });
    });

    // Create a group chat from User A involving User B
    await userA.agent.post("/api/v1/conversations").send({
      type: "GROUP",
      name: "Socket Test Group",
      memberIds: [userB.id],
    });

    const receivedData = await eventPromise;
    expect(receivedData).toBeDefined();
    expect(receivedData.type).toBe("GROUP");

    clientSocket.disconnect();
  });

  it("GET /conversations -> should return all conversations for authenticated user", async () => {
    const res = await userA.agent.get("/api/v1/conversations");

    expect(res.status).toBe(200);
    expect(res.body.data.conversations.length).toBeGreaterThanOrEqual(2);
  });

  it("GET /conversations/:id -> should successfully return conversation details for a member", async () => {
    const res = await userA.agent.get(`/api/v1/conversations/${groupConvId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.conversation).toBeDefined();
    expect(res.body.data.conversation.id).toBe(groupConvId);
    expect(res.body.data.conversation.name).toBe("Engineering Team");
    expect(res.body.data.conversation.members).toBeDefined();
    expect(res.body.data.conversation.members.length).toBeGreaterThanOrEqual(2);
  });

  it("GET /conversations/:id -> should fail with 403 if user is not a member", async () => {
    const res = await userC.agent.get(`/api/v1/conversations/${groupConvId}`);

    expect(res.status).toBe(403);
  });

  it("POST /conversations/:id/members -> should deny non admin (User B) from adding members", async () => {
    const res = await userB.agent
      .post(`/api/v1/conversations/${groupConvId}/members`)
      .send({ memberIds: [userC.id] });

    expect(res.status).toBe(403);
  });

  it("POST /conversations/:id/members -> should allow Admin (User A) to add User C", async () => {
    const res = await userA.agent
      .post(`/api/v1/conversations/${groupConvId}/members`)
      .send({ memberIds: [userC.id] });

    expect(res.status).toBe(200);
  });

  it("PATCH /conversations/:id/members/:userId -> should promote User B to ADMIN", async () => {
    const res = await userA.agent
      .patch(`/api/v1/conversations/${groupConvId}/members/${userB.id}`)
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
