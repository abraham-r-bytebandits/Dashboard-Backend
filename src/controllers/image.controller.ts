import { Request, Response } from "express";
import multer from "multer";
import sharp from "sharp";
import { sendSuccess, sendError } from "../utils/response";

// Configure Multer to store the uploaded file in memory
// This allows us to pass the buffer directly to Sharp
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// The Controller Function to handle conversion
export const convertToWebp = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return sendError(res, "No image file provided", 400);
    }

    // Process the image buffer with Sharp
    const webpBuffer = await sharp(req.file.buffer)
      .webp({ quality: 80 }) // 80% quality by default
      .toBuffer();

    // Send the converted WebP image back to the client
    res.set("Content-Type", "image/webp");
    return res.status(200).send(webpBuffer);
  } catch (error) {
    console.error("Image conversion error:", error);
    return sendError(res, "Failed to convert image", 500);
  }
};
