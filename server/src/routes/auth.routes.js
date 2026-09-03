import { Router } from "express";
import { login, register } from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.js";
import { LoginUserSchema, RegisterUserSchema } from "@messaging/shared";
import { authRateLimiter } from "../middlewares/rateLimiter.js";

const router = Router();

router.post(
  "/register",
  authRateLimiter,
  validate(RegisterUserSchema),
  register,
);

router.post("/login", authRateLimiter, validate(LoginUserSchema), login);

export default router;
