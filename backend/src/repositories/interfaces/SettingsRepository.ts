/**
 * SettingsRepository (interface)
 *
 * Data-access contract for the single RestaurantSettings row that backs
 * site-wide details (name, contact info, hours) editable from
 * /admin/settings.
 */
import type { RestaurantSettings } from "@prisma/client";

export type UpdateSettingsInput = Partial<
  Omit<RestaurantSettings, "id" | "updatedAt">
>;

export interface SettingsRepository {
  get(): Promise<RestaurantSettings>;
  update(input: UpdateSettingsInput): Promise<RestaurantSettings>;
}
