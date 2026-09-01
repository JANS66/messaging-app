import { z } from "zod";

export const ConversationTypeEnum = z.enum(["DIRECT", "GROUP"]);
export const MemberRoleEnum = z.enum(["MEMBER", "ADMIN"]);
export const MessageTypeEnum = z.enum([
  "TEXT",
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "FILE",
  "SYSTEM",
]);
export const ReceiptStatusEnum = z.enum(["DELIVERED", "READ"]);

export const UuidParamSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

export const PaginationQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
