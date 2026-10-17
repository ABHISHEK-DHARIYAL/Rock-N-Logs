/**
 * GalleryRepository (interface)
 *
 * Data-access contract for the public photo gallery.
 */
import type { GalleryPhoto, Image } from "@prisma/client";

export type GalleryPhotoWithImage = GalleryPhoto & { image: Image };

export interface GalleryRepository {
  list(): Promise<GalleryPhotoWithImage[]>;
  create(imageId: string, caption?: string | null, sortOrder?: number): Promise<GalleryPhotoWithImage>;
  delete(id: string): Promise<void>;
}
