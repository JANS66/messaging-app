import { Router } from "express";
import {
  createConversation,
  getConversations,
  getConversationById,
  updateGroupDetails,
} from "../controllers/conversations.controller.js";
import { authenticate, verifyActiveUser } from "../middlewares/auth.js";
import {
  CreateConversationSchema,
  GetConversationSchema,
  UpdateConversationSchema,
} from "@messaging-app/shared/src/conversation.js";
import { checkBlocked } from "../middlewares/checkBlocked.js";
import { checkMembership } from "../middlewares/checkMembership.js";
import { validate } from "../middlewares/validate.js";
import { checkGroupAdmin } from "../middlewares/checkGroupAdmin.js";
import { upload } from "../middlewares/upload.js";

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

router.patch(
  "/:id",
  authenticate,
  verifyActiveUser,
  checkMembership,
  checkGroupAdmin,
  upload.single("groupAvatar"),
  validate(UpdateConversationSchema),
  updateGroupDetails,
);

export default router;
