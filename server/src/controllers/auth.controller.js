import bcrypt from "bcryptjs";
import { prisma } from "../config/db.js";
import { generateToken, setAuthCookie, clearAuthCookie } from "../utils/jwt.js";
import { Prisma } from "@prisma/client";

// Pre computed dummy hash used to mitigate timing attacks when a user is not found
const DUMMY_HASH =
  "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUUWXYZ123456";

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

export const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Fetch user by unique email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true,
        avatarUrl: true,
        status: true,
        isOnline: true,
        createdAt: true,
      },
    });

    // Perform constant time password comparison (mitigates timing attacks)
    const targetHash = user ? user.passwordHash : DUMMY_HASH;
    const isPasswordValid = await bcrypt.compare(password, targetHash);

    if (!user || !isPasswordValid) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid email or password",
      });
    }

    // Issue JWT Token and set HTTP only Cookie
    const token = generateToken({ userId: user.id });
    setAuthCookie(res, token);

    // Exclude passwordHash from response payload
    const { passwordHash, ...userPayload } = user;

    return res.status(200).json({
      status: "success",
      data: {
        user: userPayload,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res) => {
  // Clear the HTTP only cookie
  clearAuthCookie(res);

  return res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
};
