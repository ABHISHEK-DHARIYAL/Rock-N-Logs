/**
 * ImageRepository (interface)
 *
 * Data-access contract for the `Image` table, which records the metadata
 * of assets uploaded through ImageStorage (see services/image). Kept
 * separate from ImageStorage itself: this repository owns the database
 * row, ImageStorage owns the remote (Cloudinary/mock) file.
 */
import type { Image } from "@prisma/client";

export interface CreateImageInput {
  url: string;
  providerId: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface ImageRepository {
  create(input: CreateImageInput): Promise<Image>;
  findById(id: string): Promise<Image | null>;
  delete(id: string): Promise<void>;
  /** Most-recently-uploaded first; used by the admin image library view. */
  listRecent(limit?: number): Promise<Image[]>;
}
