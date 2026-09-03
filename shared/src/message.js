import { z } from "zod";
import {
  MessageTypeEnum,
  ReceiptStatusEnum,
  UuidParamSchema,
} from "./common.js";

export const AttachmentInputSchema = z.object({
  url: z.string().url("Invalid file URL"),
  fileType: z.string().min(1, "MIME type is required"),
  fileSize: z.number().int().positive("File size must be positive"),
});

export const SendMessageSchema = z
  .object({
    params: UuidParamSchema,
    body: z.object({
      content: z
        .string()
        .max(10000, "Message length exceeds limits")
        .optional(),
      type: MessageTypeEnum.default("TEXT"),
      attachments: z
        .array(AttachmentInputSchema)
        .max(10, "Max 10 attachments allowed")
        .optional(),
    }),
  })
  .refine(
    (data) => {
      if (data.body.type === "SYSTEM") return true;
      const hasContent =
        !!data.body.content && data.body.content.trim().length > 0;
      const hasAttachments =
        !!data.body.attachments && data.body.attachments.length > 0;
      return hasContent || hasAttachments;
    },
    {
      message: "Message must contain either text content or attachments",
      path: ["body", "content"],
    },
  );

export const EditMessageSchema = z.object({
  params: z.object({ messageId: z.string().uuid() }),
  body: z.object({
    content: z.string().min(1, "Content cannot be empty").max(10000),
  }),
});

export const MessageReactionSchema = z.object({
  params: z.object({ messageId: z.string().uuid() }),
  body: z.object({
    emoji: z
      .string()
      .min(1)
      .max(8)
      .regex(/\p{Extended_Pictographic}/u, "Must be a valid emoji character"),
  }),
});

export const DeleteReactionParamsSchema = z.object({
  params: z.object({
    messageId: z.string().uuid(),
    emoji: z.string().min(1),
  }),
});

export const UpdateMessageStatusSchema = z.object({
  params: z.object({ messageId: z.string().uuid() }),
  body: z.object({
    status: ReceiptStatusEnum,
  }),
});
