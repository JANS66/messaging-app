import { z } from "zod";
import {
  ConversationTypeEnum,
  MemberRoleEnum,
  UuidParamSchema,
} from "./common.js";

export const CreateConversationSchema = z
  .object({
    body: z.object({
      type: ConversationTypeEnum,
      name: z.string().min(1).max(100).optional(),
      groupAvatar: z.string().url().nullable().optional(),
      memberIds: z
        .array(z.string().uuid())
        .min(1, "At least one member must be selected")
        // Clean up duplicate IDs
        .transform((ids) => Array.from(new Set(ids))),
    }),
  })
  .refine(
    (data) =>
      !(
        data.body.type === "GROUP" &&
        (!data.body.name || data.body.name.trim() === "")
      ),
    {
      message: "Group name is required when creating a group conversation",
      path: ["body", "name"],
    },
  );

export const UpdateConversationSchema = z.object({
  params: UuidParamSchema,
  body: z.object({
    name: z.string().min(1).max(100).optional(),
  }),
});

export const AddConversationMembersSchema = z.object({
  params: UuidParamSchema,
  body: z.object({
    memberIds: z
      .array(z.string().uuid())
      .min(1, "Provide at least one user ID to add"),
  }),
});

export const MemberParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid Conversation ID"),
    userId: z.string().uuid("Invalid User ID"),
  }),
});

export const UpdateMemberRoleSchema = z.object({
  params: MemberParamsSchema.shape.params,
  body: z.object({
    role: MemberRoleEnum,
  }),
});

export const GetConversationSchema = z.object({
  params: UuidParamSchema,
});
