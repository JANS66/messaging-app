import { prisma } from "../config/db.js";
import { Prisma } from "@prisma/client";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinary.js";

export const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        status: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User account no longer exists",
      });
    }

    return res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  let newUploadedPublicId = null;

  try {
    const { username, status } = req.body;

    // SHort circuit: Reject empty requests before hitting Cloudinary or DB
    if (username === undefined && status === undefined && !req.file) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide at least one field to update",
      });
    }

    // Read old avatar public ID directly from req.user (populated by verifyActiveUser)
    const oldAvatarPublicId = req.user.avatarPublicId;

    // Upload NEW file to Cloudinary if provided
    let newAvatarUrl;
    let newAvatarPublicId;

    if (req.file) {
      const uploadResult = await uploadToCloudinary(
        req.file.buffer,
        "messaging-app/avatars",
      );
      newAvatarUrl = uploadResult.url;
      newAvatarPublicId = uploadResult.publicId;
      newUploadedPublicId = uploadResult.publicId; // Tracked for rollback cleanup
    }

    // Update Database (Atomic)
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(username !== undefined && { username }),
        ...(status !== undefined && { status }),
        ...(newAvatarUrl && {
          avatarUrl: newAvatarUrl,
          avatarPublicId: newAvatarPublicId,
        }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        status: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Delete OLD asset ONLY AFTER DB update succeeds
    if (newAvatarPublicId && oldAvatarPublicId) {
      deleteFromCloudinary(oldAvatarPublicId).catch((err) =>
        console.error("Failed to delete legacy avatar:", err),
      );
    }

    return res.status(200).json({
      status: "success",
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    // ROLLBACK CLEANUP: Remove orphaned Cloudinary file if DB query failed
    if (newUploadedPublicId) {
      await deleteFromCloudinary(newUploadedPublicId).catch((cleanupErr) =>
        console.error("Failed to cleanup orphaned avatar:", cleanupErr),
      );
    }

    // Unique constraint collision (P2002)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        status: "fail",
        message: "Username is already taken",
      });
    }

    next(error);
  }
};
