import { Router } from "express";
import {
  getMe,
  searchUsers,
  updateProfile,
} from "../controllers/user.controller.js";
import { authenticate, verifyActiveUser } from "../middlewares/auth.js";
import {
  SearchUsersQuerySchema,
  UpdateProfileSchema,
} from "@messaging-app/shared";
import { upload } from "../middlewares/upload.js";
import { validate } from "../middlewares/validate.js";
import { rateLimiter } from "../middlewares/rateLimiter.js";
const router = Router();

router.get("/me", authenticate, getMe);

router.patch(
  "/me",
  authenticate,
  verifyActiveUser,
  upload.single("avatar"),
  validate(UpdateProfileSchema),
  updateProfile,
);

// Search endpoint
router.get(
  "/search",
  authenticate,
  rateLimiter("search"),
  validate(SearchUsersQuerySchema),
  searchUsers,
);

export default router;
