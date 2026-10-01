/**
 * Settings Service
 *
 * Business operation: reading and updating site-wide restaurant details
 * (name, contact info, hours) shown across the public site and used as
 * the source of the restaurant's WhatsApp notification number.
 */
import type { SettingsRepository, UpdateSettingsInput } from "../../repositories/interfaces/SettingsRepository";

export class SettingsService {
  constructor(private readonly settings: SettingsRepository) {}

  async getSettings() {
    return this.settings.get();
  }

  async updateSettings(input: UpdateSettingsInput) {
    return this.settings.update(input);
  }
}
