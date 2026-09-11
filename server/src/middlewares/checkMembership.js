import { prisma } from "../config/db.js";

/**
 * Ensures the authenticated user belongs to the requested conversation.
 * Extracts conversationId from route params or body.
 */
export const checkMembership = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID is required." });
    }

    // Leverages the @@unique([conversationId, userId]) compound index for O(1) lookup
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!member) {
      return res.status(403).json({
        error: "Access denied. You are not a member of this conversation.",
      });
    }

    // Attach membership context to request for downstream middlewares or controllers
    req.membership = member;
    next();
  } catch (err) {
    next(err);
  }
};
