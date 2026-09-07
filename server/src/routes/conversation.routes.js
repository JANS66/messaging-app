import { Router } from "express";
import { getConversations } from "../controllers/conversations.controller.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Protect all conversation routes
router.use(authenticate);

router.get("/", getConversations);

export default router;
