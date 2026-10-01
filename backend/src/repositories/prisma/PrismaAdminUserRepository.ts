/**
 * PrismaAdminUserRepository
 *
 * Concrete AdminUserRepository implementation backed by Prisma/PostgreSQL.
 */
import type { PrismaClient } from "@prisma/client";
import type { AdminUserRepository } from "../interfaces/AdminUserRepository";

export class PrismaAdminUserRepository implements AdminUserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByEmail(email: string) {
    return this.db.adminUser.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.db.adminUser.findUnique({ where: { id } });
  }

  async create(email: string, passwordHash: string, name: string) {
    return this.db.adminUser.create({ data: { email, passwordHash, name } });
  }

  async count() {
    return this.db.adminUser.count();
  }
}
