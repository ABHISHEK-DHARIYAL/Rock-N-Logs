/**
 * Menu Document Service
 *
 * Business operation: managing the PDF version of the menu shown on the
 * public site. Coordinates DocumentStorage (remote file) and
 * MenuDocumentRepository (the row referencing it), same ordering
 * discipline as ImageService: upload the new file and confirm success
 * before removing the old one, so a failed upload never leaves the
 * restaurant without a PDF menu.
 */
import { ValidationError } from "../../domain/errors";
import type { DocumentStorage } from "../document/DocumentStorage";
import type { MenuDocumentRepository } from "../../repositories/interfaces/MenuDocumentRepository";

const UPLOAD_FOLDER = "menu-pdf";
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export class MenuDocumentService {
  constructor(
    private readonly storage: DocumentStorage,
    private readonly documents: MenuDocumentRepository
  ) {}

  async getCurrentDocument() {
    return this.documents.get();
  }

  /** Uploads a new PDF menu, replacing whichever one is currently live. */
  async replaceDocument(fileBuffer: Buffer, filename: string, mimeType: string) {
    if (mimeType !== "application/pdf") {
      throw new ValidationError("The menu must be uploaded as a PDF file.");
    }
    if (fileBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
      throw new ValidationError("PDF menu must be under 15MB.");
    }
    if (fileBuffer.byteLength === 0) {
      throw new ValidationError("The uploaded file is empty.");
    }

    const existing = await this.documents.get();

    const uploaded = await this.storage.upload(fileBuffer, {
      folder: UPLOAD_FOLDER,
      filename: sanitizeFilename(filename),
    });

    const record = await this.documents.set({
      url: uploaded.url,
      providerId: uploaded.providerId,
      originalFilename: filename,
      fileSizeBytes: fileBuffer.byteLength,
    });

    // Best-effort cleanup of the old asset, mirroring ImageService's
    // replace ordering — the new PDF is already live and persisted, so a
    // failure to delete the old remote file doesn't fail the operation.
    if (existing.providerId) {
      try {
        await this.storage.delete(existing.providerId);
      } catch {
        // Intentionally swallowed — see ImageService.replaceImage for the
        // same tradeoff.
      }
    }

    return record;
  }

  /** Removes the current PDF menu entirely (site shows no PDF until a new one is uploaded). */
  async removeDocument() {
    const existing = await this.documents.get();
    if (existing.providerId) {
      await this.storage.delete(existing.providerId);
    }
    return this.documents.clear();
  }
}

function sanitizeFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  const safeBase = base.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 60);
  return `${safeBase}-${Date.now()}.pdf`;
}
