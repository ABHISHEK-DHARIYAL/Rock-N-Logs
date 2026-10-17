/**
 * PrismaMenuDocumentRepository
 *
 * Concrete MenuDocumentRepository implementation backed by
 * Prisma/PostgreSQL. Uses upsert against the fixed id "singleton" — same
 * pattern as PrismaSettingsRepository — so callers never need to think
 * about whether the row already exists.
 */
import type { PrismaClient } from "@prisma/client";
import type { MenuDocumentRepository, SetMenuDocumentInput } from "../interfaces/MenuDocumentRepository";

const DOCUMENT_ID = "singleton";

export class PrismaMenuDocumentRepository implements MenuDocumentRepository {
  constructor(private readonly db: PrismaClient) {}

  async get() {
    return this.db.menuDocument.upsert({
      where: { id: DOCUMENT_ID },
      update: {},
      create: { id: DOCUMENT_ID },
    });
  }

  async set(input: SetMenuDocumentInput) {
    return this.db.menuDocument.upsert({
      where: { id: DOCUMENT_ID },
      update: input,
      create: { id: DOCUMENT_ID, ...input },
    });
  }

  async clear() {
    return this.db.menuDocument.upsert({
      where: { id: DOCUMENT_ID },
      update: { url: null, providerId: null, originalFilename: null, fileSizeBytes: null },
      create: { id: DOCUMENT_ID },
    });
  }
}
