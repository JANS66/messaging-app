import { Router } from "express";
import { login, register, logout } from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.js";
import { LoginUserSchema, RegisterUserSchema } from "@messaging-app/shared";
import { authRateLimiter } from "../middlewares/rateLimiter.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.post(
  "/register",
  authRateLimiter,
  validate(RegisterUserSchema),
  register,
);

router.post("/login", authRateLimiter, validate(LoginUserSchema), login);

router.post("/logout", authenticate, logout);

export default router;
