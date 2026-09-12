import { prisma } from "../config/db.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinary.js";

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

export const getConversationById = async (req, res, next) => {
  const { id } = req.params;
  const currentUserId = req.user.id;

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                status: true,
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

    if (!conversation) {
      return res.status(404).json({
        status: "fail",
        message: "Conversation not found",
      });
    }

    const isDirect = conversation.type === "DIRECT";

    // Extract the other participant if this is a 1 on 1 chat
    const otherMember = isDirect
      ? conversation.members.find((m) => m.userId !== currentUserId)?.user
      : null;

    const formattedConversation = {
      id: conversation.id,
      type: conversation.type,
      name: isDirect ? otherMember?.username : conversation.name,
      avatarUrl: isDirect ? otherMember?.avatarUrl : conversation.groupAvatar,
      groupAvatar: conversation.groupAvatar,
      updatedAt: conversation.updatedAt,
      createdAt: conversation.createdAt,
      recipient: otherMember
        ? {
            id: otherMember.id,
            username: otherMember.username,
            avatarUrl: otherMember.avatarUrl,
            status: otherMember.status,
            isOnline: otherMember.isOnline,
            lastSeen: otherMember.lastSeen,
          }
        : null,
      members: conversation.members.map((m) => ({
        id: m.user.id,
        username: m.user.username,
        avatarUrl: m.user.avatarUrl,
        status: m.user.status,
        isOnline: m.user.isOnline,
        lastSeen: m.user.lastSeen,
        role: m.role,
        joinedAt: m.joinedAt,
        lastReadAt: m.lastReadAt,
      })),
      lastMessage: conversation.lastMessage,
    };

    return res.status(200).json({
      status: "success",
      data: {
        conversation: formattedConversation,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateGroupDetails = async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;
  let newUploadedPublicId = null;

  // Short circuit: Reject empty requests before touching DB or Cloudinary
  if (name === undefined && !req.file) {
    return res.status(400).json({
      status: "fail",
      message:
        "Please provide at least one field to update (name or groupAvatar file)",
    });
  }

  try {
    // Fetch group conversation to verify type
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        members: {
          select: { userId: true },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({
        status: "fail",
        message: "Conversation not found",
      });
    }

    if (conversation.type !== "GROUP") {
      return res.status(400).json({
        status: "fail",
        message: "Only group conversations can have their details updated",
      });
    }

    // Upload NEW file to Cloudinary if provided
    let newGroupAvatarUrl;

    if (req.file) {
      const uploadResult = await uploadToCloudinary(
        req.file.buffer,
        "messaging-app/group-avatars",
      );
      newGroupAvatarUrl = uploadResult.url;
      newUploadedPublicId = uploadResult.publicId; // Tracked for rollback cleanup
    }

    // Update Database (Atomic)
    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(newGroupAvatarUrl && { groupAvatar: newGroupAvatarUrl }),
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

    // Real time WebSocket event to all online group members
    if (req.io) {
      const payload = {
        conversationId: updatedConversation.id,
        name: updatedConversation.name,
        groupAvatar: updatedConversation.groupAvatar,
        updatedAt: updatedConversation.updatedAt,
      };

      updatedConversation.members.forEach((member) => {
        req.io.to(member.userId).emit("conversation_updated", payload);
      });
    }

    return res.status(200).json({
      status: "success",
      data: {
        conversation: updatedConversation,
      },
    });
  } catch (error) {
    // ROLLBACK CLEANUP: Remove orphaned Cloudinary file if DB query fails
    if (newUploadedPublicId) {
      await deleteFromCloudinary(newUploadedPublicId).catch((cleanupErr) =>
        console.error("Failed to cleanup orphaned group avatar:", cleanupErr),
      );
    }

    next(error);
  }
};
