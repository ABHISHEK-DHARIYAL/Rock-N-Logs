/**
 * PrismaPromotionRepository
 *
 * Concrete PromotionRepository implementation backed by Prisma/PostgreSQL.
 */
import type { PrismaClient } from "@prisma/client";
import type {
  PromotionRepository,
  CreatePromotionInput,
  UpdatePromotionInput,
} from "../interfaces/PromotionRepository";

export class PrismaPromotionRepository implements PromotionRepository {
  constructor(private readonly db: PrismaClient) {}

  async list(activeOnly = false) {
    return this.db.promotion.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { createdAt: "desc" },
      include: { image: true },
    });
  }

  async findById(id: string) {
    return this.db.promotion.findUnique({ where: { id }, include: { image: true } });
  }

  async create(input: CreatePromotionInput) {
    return this.db.promotion.create({
      data: {
        title: input.title,
        description: input.description,
        isActive: input.isActive ?? true,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
        imageId: input.imageId ?? null,
      },
      include: { image: true },
    });
  }

  async update(id: string, input: UpdatePromotionInput) {
    return this.db.promotion.update({ where: { id }, data: input, include: { image: true } });
  }

  async delete(id: string) {
    await this.db.promotion.delete({ where: { id } });
  }
}
