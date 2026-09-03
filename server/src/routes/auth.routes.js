import { Router } from "express";
import { register } from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.js";
import { RegisterUserSchema } from "@messaging/shared";
import { authRateLimiter } from "../middlewares/rateLimiter.js";

const router = Router();

router.post(
  "/register",
  authRateLimiter,
  validate(RegisterUserSchema),
  register,
);

export default router;
