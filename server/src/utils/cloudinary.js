import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const DEFAULT_TRANSFORMATIONS = {
  avatars: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
  default: [{ width: 1200, crop: "limit" }],
};

export const uploadToCloudinary = (
  fileBuffer,
  folder = "messaging-app/avatars",
) => {
  const transformations = folder.includes("avatar")
    ? DEFAULT_TRANSFORMATIONS.avatars
    : DEFAULT_TRANSFORMATIONS.default;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: transformations,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      },
    );
    stream.end(fileBuffer);
  });
};

export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Cloudinary Deletion Error:", err);
  }
};
