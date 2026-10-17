/**
 * CloudinaryImageStorage
 *
 * ImageStorage implementation backed by Cloudinary's HTTP API. This is the
 * ONLY file in the project that knows Cloudinary exists — swapping to a
 * different provider (S3, local disk, etc.) means writing one new class
 * that implements ImageStorage, with zero changes to ImageService or
 * anything above it.
 *
 * Uses Cloudinary's signed upload API directly over fetch rather than
 * pulling in the full Cloudinary SDK, since we only need two operations.
 */
import crypto from "crypto";
import { ExternalServiceError } from "../../domain/errors";
import type { ImageStorage, UploadedImage } from "./ImageStorage";

interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export class CloudinaryImageStorage implements ImageStorage {
  constructor(private readonly credentials: CloudinaryCredentials) {}

  async upload(
    fileBuffer: Buffer,
    options: { folder: string; filename: string }
  ): Promise<UploadedImage> {
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `${options.folder}/${options.filename}`;

    // Cloudinary requires a signature over all params sent (except file/api_key),
    // sorted alphabetically, hashed with the account's API secret.
    const paramsToSign = `folder=${options.folder}&public_id=${publicId}&timestamp=${timestamp}${this.credentials.apiSecret}`;
    const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(fileBuffer)]));
    form.append("api_key", this.credentials.apiKey);
    form.append("timestamp", String(timestamp));
    form.append("public_id", publicId);
    form.append("folder", options.folder);
    form.append("signature", signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.credentials.cloudName}/image/upload`,
      { method: "POST", body: form }
    );

    if (!response.ok) {
      // Never surface Cloudinary's raw error body — it can include account details.
      throw new ExternalServiceError("Cloudinary", `upload failed with status ${response.status}`);
    }

    const data = await response.json();
    return {
      url: data.secure_url,
      providerId: data.public_id,
      width: data.width,
      height: data.height,
    };
  }

  async delete(providerId: string): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `public_id=${providerId}&timestamp=${timestamp}${this.credentials.apiSecret}`;
    const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

    const form = new FormData();
    form.append("public_id", providerId);
    form.append("api_key", this.credentials.apiKey);
    form.append("timestamp", String(timestamp));
    form.append("signature", signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.credentials.cloudName}/image/destroy`,
      { method: "POST", body: form }
    );

    if (!response.ok) {
      throw new ExternalServiceError("Cloudinary", `delete failed with status ${response.status}`);
    }
  }
}
