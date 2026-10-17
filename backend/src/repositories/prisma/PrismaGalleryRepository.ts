/**
 * PrismaGalleryRepository
 *
 * Concrete GalleryRepository implementation backed by Prisma/PostgreSQL.
 */
import type { PrismaClient } from "@prisma/client";
import type { GalleryRepository } from "../interfaces/GalleryRepository";

export class PrismaGalleryRepository implements GalleryRepository {
  constructor(private readonly db: PrismaClient) {}

  async list() {
    return this.db.galleryPhoto.findMany({
      orderBy: { sortOrder: "asc" },
      include: { image: true },
    });
  }

  async create(imageId: string, caption?: string | null, sortOrder = 0) {
    return this.db.galleryPhoto.create({
      data: { imageId, caption: caption ?? null, sortOrder },
      include: { image: true },
    });
  }

  async delete(id: string) {
    await this.db.galleryPhoto.delete({ where: { id } });
  }
}
