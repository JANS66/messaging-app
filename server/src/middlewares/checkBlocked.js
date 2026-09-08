import { prisma } from "../config/db.js";

/**
 * Middleware to check for existing blocks between the current user
 * and any target members (or between target members themselves in a group).
 */
export const checkBlocked = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const targetMemberIds = req.body.memberIds;

    if (targetMemberIds.length === 0) {
      return next();
    }

    // Combine current user with all target members into one array
    const allUserIds = [currentUserId, ...targetMemberIds];

    // Check if ANY user in the group has blocked ANY other user in the group.
    // Prisma query: finds a block where both blocker and blocked belong to the user set.
    const blockRecord = await prisma.block.findFirst({
      where: {
        blockerId: { in: allUserIds },
        blockedId: { in: allUserIds },
      },
    });

    if (blockRecord) {
      return res.status(403).json({
        status: "fail",
        message:
          "Action denied. A block relationship exists between one or more participants.",
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};
