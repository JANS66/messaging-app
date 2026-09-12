import multer from "multer";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      const error = new Error("Only image files are allowed!");
      error.statusCode = 400;
      cb(error, false);
    }
  },
});

/**
 * Middleware: Streams file to Cloudinary and attaches secure_url to req.body.avatarUrl
 */
export const handleAvatarUpload = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const { url } = await uploadToCloudinary(
      req.file.buffer,
      "messaging-app/avatars",
    );
    req.body.avatarUrl = url;
    next();
  } catch (error) {
    next(error); // Sends directly to global error handler in app.js
  }
};

export const handleGroupAvatarUpload = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const { url } = await uploadToCloudinary(
      req.file.buffer,
      "messaging-app/group-avatars",
    );
    req.body.groupAvatar = url;
    next();
  } catch (error) {
    next(error);
  }
};
