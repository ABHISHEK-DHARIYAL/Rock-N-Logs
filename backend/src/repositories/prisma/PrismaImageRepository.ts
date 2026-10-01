/**
 * PrismaImageRepository
 *
 * Concrete ImageRepository implementation backed by Prisma/PostgreSQL.
 */
import type { PrismaClient } from "@prisma/client";
import type { ImageRepository, CreateImageInput } from "../interfaces/ImageRepository";

export class PrismaImageRepository implements ImageRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: CreateImageInput) {
    return this.db.image.create({
      data: {
        url: input.url,
        providerId: input.providerId,
        altText: input.altText ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
      },
    });
  }

  async findById(id: string) {
    return this.db.image.findUnique({ where: { id } });
  }

  async delete(id: string) {
    await this.db.image.delete({ where: { id } });
  }

  async listRecent(limit = 60) {
    return this.db.image.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  }
}
