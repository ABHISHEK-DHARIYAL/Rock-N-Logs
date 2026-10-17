/**
 * MockImageStorage
 *
 * Fallback ImageStorage used whenever Cloudinary credentials are not
 * configured (see the factory in ImageService.ts). Encodes the upload as
 * a data: URL so the app is fully functional — including rendering
 * uploaded images — without any external dependency or file system
 * writes (important since serverless deployments have read-only or
 * ephemeral file systems).
 *
 * This is intended for local development and demos only. Swap in
 * CloudinaryImageStorage (or another real ImageStorage implementation)
 * for production use.
 */
import crypto from "crypto";
import type { ImageStorage, UploadedImage } from "./ImageStorage";

export class MockImageStorage implements ImageStorage {
  async upload(
    fileBuffer: Buffer,
    options: { folder: string; filename: string }
  ): Promise<UploadedImage> {
    const providerId = `mock/${options.folder}/${options.filename}-${crypto.randomUUID()}`;
    const mimeType = guessMimeType(options.filename);
    const dataUrl = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;

    return { url: dataUrl, providerId };
  }

  async delete(): Promise<void> {
    // Nothing to clean up — the "asset" only ever lived as a data URL
    // referenced from the Image row, which the caller deletes separately.
  }
}

function guessMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}
