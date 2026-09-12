import { MemberRole } from "@prisma/client";

/**
 * Middleware to verify if the authenticated user is an ADMIN of the conversation.
 * MUST be executed after `checkMembership` in the middleware pipeline.
 */
export const checkGroupAdmin = (req, res, next) => {
  // Retrieve membership object attached by checkMembership
  const membership = req.membership;

  if (!membership) {
    return res.status(500).json({
      status: "fail",
      error:
        "Server configuration error: checkGroupAdmin must be preceded by checkMembership.",
    });
  }

  // Check if member role is ADMIN
  if (membership.role !== MemberRole.ADMIN && membership.role !== "ADMIN") {
    return res.status(403).json({
      status: "fail",
      error:
        "Forbidden. You must be an admin of this conversation to perfom this action.",
    });
  }

  next();
};
