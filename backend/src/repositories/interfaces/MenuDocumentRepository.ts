/**
 * MenuDocumentRepository (interface)
 *
 * Data-access contract for the singleton PDF menu row. Mirrors
 * SettingsRepository's upsert-against-a-fixed-id pattern since there is
 * only ever one current PDF menu.
 */
import type { MenuDocument } from "@prisma/client";

export interface SetMenuDocumentInput {
  url: string;
  providerId: string;
  originalFilename: string;
  fileSizeBytes: number;
}

export interface MenuDocumentRepository {
  get(): Promise<MenuDocument>;
  set(input: SetMenuDocumentInput): Promise<MenuDocument>;
  clear(): Promise<MenuDocument>;
}
