/**
 * MockDocumentStorage
 *
 * Fallback DocumentStorage used whenever Cloudinary credentials are not
 * configured (see the factory in container.ts) — mirrors
 * services/image/MockImageStorage's approach of encoding the upload as a
 * data: URL, so PDF upload/download works fully without an external
 * account. Fine for local development and small files; not intended for
 * production use with large PDFs (every request re-downloads the full
 * base64-encoded file with no CDN caching).
 */
import crypto from "crypto";
import type { DocumentStorage, UploadedDocument } from "./DocumentStorage";

export class MockDocumentStorage implements DocumentStorage {
  async upload(
    fileBuffer: Buffer,
    options: { folder: string; filename: string }
  ): Promise<UploadedDocument> {
    const providerId = `mock/${options.folder}/${options.filename}-${crypto.randomUUID()}`;
    const dataUrl = `data:application/pdf;base64,${fileBuffer.toString("base64")}`;
    return { url: dataUrl, providerId };
  }

  async delete(): Promise<void> {
    // Nothing to clean up — the "asset" only ever lived as a data URL
    // referenced from the MenuDocument row, which the caller deletes
    // separately.
  }
}
