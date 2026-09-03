import bcrypt from "bcryptjs";
import { prisma } from "../config/db.js";
import { generateToken, setAuthCookie } from "../utils/jwt.js";
import { Prisma } from "@prisma/client";

export const register = async (req, res, next) => {
  const { username, email, password } = req.body;

  try {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Direct creation
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        status: true,
        isOnline: true,
        createdAt: true,
      },
    });

    // Issue JWT Token and Set HTTP-Only Cookie
    const token = generateToken({ userId: newUser.id });
    setAuthCookie(res, token);

    // Send 201 Created
    return res.status(201).json({
      status: "success",
      data: {
        user: newUser,
      },
    });
  } catch (error) {
    // Handle Prisma Unique Constraint Violations (P2002)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const targetField = error.meta?.target?.[0] || "field";
      return res.status(409).json({
        status: "fail",
        message: `A user with that ${targetField} already exists.`,
      });
    }

    next(error);
  }
};
