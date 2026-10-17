/**
 * CloudinaryDocumentStorage
 *
 * DocumentStorage implementation backed by Cloudinary's "raw" resource
 * type — the endpoint Cloudinary uses for non-image files like PDFs,
 * as opposed to the "image" endpoint CloudinaryImageStorage uses. Same
 * signing scheme as CloudinaryImageStorage, different endpoint path.
 * This is the only file that knows that distinction.
 */
import crypto from "crypto";
import { ExternalServiceError } from "../../domain/errors";
import type { DocumentStorage, UploadedDocument } from "./DocumentStorage";

interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export class CloudinaryDocumentStorage implements DocumentStorage {
  constructor(private readonly credentials: CloudinaryCredentials) {}

  async upload(
    fileBuffer: Buffer,
    options: { folder: string; filename: string }
  ): Promise<UploadedDocument> {
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `${options.folder}/${options.filename}`;

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
      `https://api.cloudinary.com/v1_1/${this.credentials.cloudName}/raw/upload`,
      { method: "POST", body: form }
    );

    if (!response.ok) {
      throw new ExternalServiceError("Cloudinary", `document upload failed with status ${response.status}`);
    }

    const data = await response.json();
    return { url: data.secure_url, providerId: data.public_id };
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
      `https://api.cloudinary.com/v1_1/${this.credentials.cloudName}/raw/destroy`,
      { method: "POST", body: form }
    );

    if (!response.ok) {
      throw new ExternalServiceError("Cloudinary", `document delete failed with status ${response.status}`);
    }
  }
}
