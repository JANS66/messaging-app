import { prisma } from "../config/db.js";

export const getConversations = async (req, res, next) => {
  const currentUserId = req.user.id;

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        members: {
          some: {
            userId: currentUserId,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
        lastMessage: {
          select: {
            id: true,
            content: true,
            type: true,
            senderId: true,
            createdAt: true,
          },
        },
      },
    });

    // Format response to provide a clean overview per conversations
    const formattedConversations = conversations.map((conv) => ({
      id: conv.id,
      type: conv.type,
      name: conv.name,
      groupAvatar: conv.groupAvatar,
      updatedAt: conv.updatedAt,
      createdAt: conv.createdAt,
      members: conv.members.map((m) => ({
        ...m.user,
        role: m.role,
        joinedAt: m.joinedAt,
        lastReadAt: m.lastReadAt,
      })),
      lastMessage: conv.lastMessage,
    }));

    return res.status(200).json({
      status: "success",
      results: formattedConversations.length,
      data: {
        conversations: formattedConversations,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createConversation = async (req, res, next) => {
  const currentUserId = req.user.id;
  const { type, name, groupAvatar, memberIds } = req.body;

  // Include current authenticated user
  const uniqueMemberIds = Array.from(new Set([currentUserId, ...memberIds]));

  try {
    // ----------------------------------------------------
    // 1. DIRECT (1-on-1) Conversation Flow
    // ----------------------------------------------------
    if (type === "DIRECT") {
      if (uniqueMemberIds.length !== 2) {
        return res.status(400).json({
          status: "fail",
          message: "Direct conversations must have exactly 2 unique members",
        });
      }

      const otherUserId = uniqueMemberIds.find((id) => id !== currentUserId);

      // Atomic transaction to prevent duplicate DIRECT conversations under race conditions
      const conversation = await prisma.$transaction(async (tx) => {
        // Check if a DIRECT conversation already exists between these two users
        const existingConv = await tx.conversation.findFirst({
          where: {
            type: "DIRECT",
            AND: [
              { members: { some: { userId: currentUserId } } },
              { members: { some: { userId: otherUserId } } },
            ],
          },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    avatarUrl: true,
                    isOnline: true,
                    lastSeen: true,
                  },
                },
              },
            },
            lastMessage: true,
          },
        });

        if (existingConv) {
          return { conv: existingConv, isNew: false };
        }

        const newConv = await tx.conversation.create({
          data: {
            type: "DIRECT",
            members: {
              create: uniqueMemberIds.map((userId) => ({ userId })),
            },
          },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    avatarUrl: true,
                    isOnline: true,
                    lastSeen: true,
                  },
                },
              },
            },
            lastMessage: true,
          },
        });

        return { conv: newConv, isNew: true };
      });

      if (conversation.isNew && req.io) {
        req.io.to(otherUserId).emit("conversation_created", conversation.conv);
      }

      return res.status(conversation.isNew ? 201 : 200).json({
        status: "success",
        data: {
          conversation: conversation.conv,
        },
      });
    }

    // ----------------------------------------------------
    // 2. GROUP Conversation Flow
    // ----------------------------------------------------
    if (uniqueMemberIds.length < 2) {
      return res.status(400).json({
        status: "fail",
        message:
          "Group conversations must have at least 2 members (including creator)",
      });
    }

    const newGroup = await prisma.conversation.create({
      data: {
        type: "GROUP",
        name,
        groupAvatar: groupAvatar || null,
        members: {
          create: uniqueMemberIds.map((userId) => ({
            userId,
            role: userId === currentUserId ? "ADMIN" : "MEMBER",
          })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
        lastMessage: true,
      },
    });

    if (req.io) {
      uniqueMemberIds.forEach((memberId) => {
        if (memberId !== currentUserId) {
          req.io.to(memberId).emit("conversation_created", newGroup);
        }
      });
    }

    return res.status(201).json({
      status: "success",
      data: {
        conversation: newGroup,
      },
    });
  } catch (error) {
    next(error);
  }
};
