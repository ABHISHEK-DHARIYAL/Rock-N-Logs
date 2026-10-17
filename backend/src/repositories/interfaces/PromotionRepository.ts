/**
 * PromotionRepository (interface)
 *
 * Data-access contract for marketing promotions shown on the public site.
 */
import type { Promotion, Image } from "@prisma/client";

export type PromotionWithImage = Promotion & { image: Image | null };

export interface CreatePromotionInput {
  title: string;
  description: string;
  isActive?: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  imageId?: string | null;
}

export type UpdatePromotionInput = Partial<CreatePromotionInput>;

export interface PromotionRepository {
  list(activeOnly?: boolean): Promise<PromotionWithImage[]>;
  findById(id: string): Promise<PromotionWithImage | null>;
  create(input: CreatePromotionInput): Promise<PromotionWithImage>;
  update(id: string, input: UpdatePromotionInput): Promise<PromotionWithImage>;
  delete(id: string): Promise<void>;
}
