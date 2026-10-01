/**
 * Idempotent first-run bootstrap.
 *
 * Render's free tier has no Shell and no pre-deploy command, so the admin
 * account can't be created by hand. Instead the API makes sure it exists
 * every time it boots, using ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD:
 *   - no such admin      -> created
 *   - password changed   -> hash updated (so changing the env var + redeploy
 *                           is also your "forgot password" recovery path)
 *   - nothing changed    -> no write
 */
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { env } from "./env";

const MIN_PASSWORD_LENGTH = 8;

export async function ensureAdminUser(): Promise<void> {
  const creds = env.adminCredentials();
  if (!creds) {
    console.warn("[bootstrap] ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD not both set — skipping admin setup.");
    return;
  }
  if (creds.password.length < MIN_PASSWORD_LENGTH) {
    console.error(`[bootstrap] ADMIN_SEED_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters — admin not created.`);
    return;
  }

  const existing = await prisma.adminUser.findUnique({ where: { email: creds.email } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(creds.password, 12);
    await prisma.adminUser.create({ data: { email: creds.email, passwordHash, name: "Restaurant Admin" } });
    console.log(`[bootstrap] Created admin user ${creds.email}`);
    return;
  }

  if (!(await bcrypt.compare(creds.password, existing.passwordHash))) {
    const passwordHash = await bcrypt.hash(creds.password, 12);
    await prisma.adminUser.update({ where: { id: existing.id }, data: { passwordHash } });
    console.log(`[bootstrap] Updated password for admin ${creds.email} to match ADMIN_SEED_PASSWORD`);
  }
}
