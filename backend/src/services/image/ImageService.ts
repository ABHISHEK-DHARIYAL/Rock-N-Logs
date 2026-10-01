/**
 * Image Service
 *
 * Business operation: managing image assets used across menu items,
 * promotions, and the gallery.
 *
 * Coordinates two collaborators that must stay in sync:
 *   - ImageStorage    (uploads/deletes the actual file — Cloudinary or mock)
 *   - ImageRepository (persists the Image row referencing that file)
 *
 * Ordering rules (see spec section Q — Cloudinary Architecture):
 *   - Delete: verify the DB record exists BEFORE deleting the remote
 *     asset, then delete remote asset, then delete the DB row.
 *   - Replace: upload the NEW asset and confirm success BEFORE removing
 *     the old one, so a failed upload never leaves the item imageless.
 */
import { NotFoundError } from "../../domain/errors";
import type { ImageStorage } from "./ImageStorage";
import type { ImageRepository } from "../../repositories/interfaces/ImageRepository";
import type { Image } from "@prisma/client";

const UPLOAD_FOLDER = "restaurant";

export class ImageService {
  constructor(
    private readonly storage: ImageStorage,
    private readonly images: ImageRepository
  ) {}

  /** Uploads a new image and persists its metadata. */
  async uploadImage(
    fileBuffer: Buffer,
    filename: string,
    altText?: string
  ): Promise<Image> {
    const uploaded = await this.storage.upload(fileBuffer, {
      folder: UPLOAD_FOLDER,
      filename: sanitizeFilename(filename),
    });

    return this.images.create({
      url: uploaded.url,
      providerId: uploaded.providerId,
      altText: altText ?? null,
      width: uploaded.width ?? null,
      height: uploaded.height ?? null,
    });
  }

  /**
   * Replaces an existing image with a newly uploaded one, returning the
   * new Image record. The old asset is only removed after the new upload
   * has succeeded, so a failed replacement leaves the original intact.
   */
  async replaceImage(
    existingImageId: string,
    fileBuffer: Buffer,
    filename: string,
    altText?: string
  ): Promise<Image> {
    const existing = await this.images.findById(existingImageId);
    if (!existing) {
      throw new NotFoundError("Image", existingImageId);
    }

    const newImage = await this.uploadImage(fileBuffer, filename, altText);

    // Best-effort cleanup of the old asset; the new image is already
    // live and persisted, so we don't fail the whole operation if the
    // old remote file can't be removed (it can be garbage collected
    // separately if needed).
    try {
      await this.storage.delete(existing.providerId);
      await this.images.delete(existing.id);
    } catch {
      // Intentionally swallowed: replacement already succeeded from the
      // caller's point of view. Orphaned old assets are a cleanup
      // concern, not a correctness concern.
    }

    return newImage;
  }

  /** Lists recently uploaded images for the admin image library. */
  async listRecentImages(limit?: number): Promise<Image[]> {
    return this.images.listRecent(limit);
  }

  /** Deletes an image's remote asset and its database record. */
  async deleteImage(imageId: string): Promise<void> {
    const image = await this.images.findById(imageId);
    if (!image) {
      throw new NotFoundError("Image", imageId);
    }

    await this.storage.delete(image.providerId);
    await this.images.delete(imageId);
  }
}

function sanitizeFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  const ext = filename.match(/\.[^.]+$/)?.[0] ?? "";
  const safeBase = base.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 60);
  return `${safeBase}-${Date.now()}${ext}`;
}
