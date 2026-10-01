/**
 * Promotion Service
 *
 * Business operation: managing marketing promotions shown on the public
 * site. Enforces that a promotion's active window (startsAt/endsAt), if
 * both are set, is chronologically valid.
 */
import { NotFoundError, ValidationError } from "../../domain/errors";
import type {
  PromotionRepository,
  CreatePromotionInput,
  UpdatePromotionInput,
} from "../../repositories/interfaces/PromotionRepository";

export class PromotionService {
  constructor(private readonly promotions: PromotionRepository) {}

  /** Returns promotions currently within their active window (or with no window set). */
  async getActivePromotions() {
    const all = await this.promotions.list(true);
    const now = new Date();
    return all.filter((promo) => {
      if (promo.startsAt && promo.startsAt > now) return false;
      if (promo.endsAt && promo.endsAt < now) return false;
      return true;
    });
  }

  async listAll() {
    return this.promotions.list(false);
  }

  async create(input: CreatePromotionInput) {
    this.validate(input);
    return this.promotions.create(input);
  }

  async update(id: string, input: UpdatePromotionInput) {
    const existing = await this.promotions.findById(id);
    if (!existing) {
      throw new NotFoundError("Promotion", id);
    }
    this.validate({ ...existing, ...input });
    return this.promotions.update(id, input);
  }

  async delete(id: string) {
    const existing = await this.promotions.findById(id);
    if (!existing) {
      throw new NotFoundError("Promotion", id);
    }
    await this.promotions.delete(id);
  }

  private validate(input: Partial<CreatePromotionInput>) {
    if (input.title !== undefined && !input.title.trim()) {
      throw new ValidationError("Promotion title is required.");
    }
    if (input.startsAt && input.endsAt && input.startsAt > input.endsAt) {
      throw new ValidationError("Start date must be before end date.");
    }
  }
}
