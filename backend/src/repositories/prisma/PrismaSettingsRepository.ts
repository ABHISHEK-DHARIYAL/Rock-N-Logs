/**
 * PrismaSettingsRepository
 *
 * Concrete SettingsRepository implementation backed by Prisma/PostgreSQL.
 * Uses upsert against the fixed id "singleton" so callers never need to
 * think about whether the settings row already exists.
 */
import type { PrismaClient } from "@prisma/client";
import type { SettingsRepository, UpdateSettingsInput } from "../interfaces/SettingsRepository";

const SETTINGS_ID = "singleton";

export class PrismaSettingsRepository implements SettingsRepository {
  constructor(private readonly db: PrismaClient) {}

  async get() {
    return this.db.restaurantSettings.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: { id: SETTINGS_ID },
    });
  }

  async update(input: UpdateSettingsInput) {
    return this.db.restaurantSettings.upsert({
      where: { id: SETTINGS_ID },
      update: input,
      create: { id: SETTINGS_ID, ...input },
    });
  }
}
