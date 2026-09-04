import { Router } from "express";
import { getMe, updateProfile } from "../controllers/user.controller.js";
import { authenticate, verifyActiveUser } from "../middlewares/auth.js";
import { UpdateProfileSchema } from "@messaging-app/shared";
import { upload } from "../middlewares/upload.js";
import { validate } from "../middlewares/validate.js";

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

export default router;
