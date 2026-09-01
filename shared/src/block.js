import { z } from "zod";

export const BlockUserSchema = z.object({
  body: z.object({
    blockedId: z.string().uuid("Invalid user ID to block"),
  }),
});

export const UnblockUserSchema = z.object({
  params: z.object({
    blockedId: z.string().uuid("Invalid user ID"),
  }),
});
