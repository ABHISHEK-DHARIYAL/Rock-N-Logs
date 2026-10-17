/**
 * Gallery Service
 *
 * Business operation: managing the public photo gallery. Deliberately
 * thin — the gallery has no rules beyond "an image must exist" — but kept
 * as its own service rather than folded into ImageService, since gallery
 * curation (captions, ordering) is a distinct responsibility from raw
 * image storage.
 */
import { ValidationError } from "../../domain/errors";
import type { GalleryRepository } from "../../repositories/interfaces/GalleryRepository";

export class GalleryService {
  constructor(private readonly gallery: GalleryRepository) {}

  async listPhotos() {
    return this.gallery.list();
  }

  async addPhoto(imageId: string, caption?: string, sortOrder?: number) {
    if (!imageId) {
      throw new ValidationError("An uploaded image is required.");
    }
    return this.gallery.create(imageId, caption, sortOrder);
  }

  async removePhoto(id: string) {
    await this.gallery.delete(id);
  }
}
