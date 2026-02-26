import { v2 as cloudinary } from "cloudinary";

/**
 * Ensure Cloudinary is configured with current env vars.
 * Called before every upload/delete to guarantee config is set
 * even if this module was imported before dotenv.config() ran.
 */
const ensureConfig = () => {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud_name || !api_key || !api_secret) {
    console.error("[Cloudinary] ❌ Missing env vars:", {
      cloud_name: cloud_name ? "✅ set" : "❌ MISSING",
      api_key: api_key ? "✅ set" : "❌ MISSING",
      api_secret: api_secret ? "✅ set" : "❌ MISSING",
    });
    throw new Error("Cloudinary environment variables are not configured");
  }

  cloudinary.config({ cloud_name, api_key, api_secret });
};

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer from multer memoryStorage
 * @param {string} folder - The Cloudinary folder (e.g. "products", "business")
 * @returns {Promise<{url: string, public_id: string}>}
 */
export const uploadToCloudinary = (fileBuffer, folder = "products") => {
  ensureConfig();

  console.log(
    `[Cloudinary] Uploading to folder: licoreria/${folder}, buffer size: ${fileBuffer?.length || 0} bytes`,
  );

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `licoreria/${folder}`,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          console.error("[Cloudinary] ❌ Upload error:", error.message);
          return reject(error);
        }
        console.log("[Cloudinary] ✅ Upload successful:", result.secure_url);
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
        });
      },
    );
    stream.end(fileBuffer);
  });
};

/**
 * Delete an image from Cloudinary by its public_id or URL
 * @param {string} imageUrl - The Cloudinary URL
 */
export const deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl || !imageUrl.includes("cloudinary")) return;
    ensureConfig();
    // Extract public_id from URL
    const parts = imageUrl.split("/");
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return;
    // public_id is everything after "upload/vXXXXX/"
    const publicIdWithExt = parts.slice(uploadIndex + 2).join("/");
    const public_id = publicIdWithExt.replace(/\.[^/.]+$/, "");
    await cloudinary.uploader.destroy(public_id);
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error.message);
  }
};

export default cloudinary;
