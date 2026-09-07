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
        messages: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            content: true,
            senderId: true,
            createdAt: true,
          },
        },
      },
    });

    // Format response to provide a clean overview per conversations
    const formattedConversations = conversations.map((conv) => {
      const lastMessage = conv.messages[0] || null;

      return {
        id: conv.id,
        isGroup: conv.isGroup,
        name: conv.name,
        updatedAt: conv.updatedAt,
        createdAt: conv.createdAt,
        participants: conv.participants.map((p) => p.user),
        lastMessage,
      };
    });

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
