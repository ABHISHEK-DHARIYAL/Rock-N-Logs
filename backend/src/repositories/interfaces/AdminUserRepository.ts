/**
 * AdminUserRepository (interface)
 *
 * Data-access contract for admin staff accounts. Kept separate from a
 * hypothetical future "customer account" repository (Interface
 * Segregation) since the two have entirely different lifecycles and
 * security requirements.
 */
import type { AdminUser } from "@prisma/client";

export interface AdminUserRepository {
  findByEmail(email: string): Promise<AdminUser | null>;
  findById(id: string): Promise<AdminUser | null>;
  create(email: string, passwordHash: string, name: string): Promise<AdminUser>;
  count(): Promise<number>;
}
