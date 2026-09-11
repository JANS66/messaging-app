import { Router } from "express";
import {
  createConversation,
  getConversations,
  getConversationById,
} from "../controllers/conversations.controller.js";
import { authenticate, verifyActiveUser } from "../middlewares/auth.js";
import {
  CreateConversationSchema,
  GetConversationSchema,
} from "@messaging-app/shared/src/conversation.js";
import { checkBlocked } from "../middlewares/checkBlocked.js";
import { checkMembership } from "../middlewares/checkMembership.js";
import { validate } from "../middlewares/validate.js";

const router = Router();

// Protect all conversation routes
router.use(authenticate);

router.get("/", getConversations);

router.post(
  "/",
  authenticate,
  verifyActiveUser,
  validate(CreateConversationSchema),
  checkBlocked,
  createConversation,
);

router.get(
  "/:id",
  authenticate,
  validate(GetConversationSchema),
  checkMembership,
  getConversationById,
);

export default router;
