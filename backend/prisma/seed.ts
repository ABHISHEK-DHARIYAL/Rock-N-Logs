/**
 * Database Seed Script
 *
 * Creates/syncs the admin account (ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD) and
 * the singleton settings row. Safe to re-run. The API also runs the admin step
 * on every boot, so on Render you normally never need to run this by hand.
 *
 * Run with: npm run db:seed
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { ensureAdminUser } from "../src/lib/bootstrap";

async function main() {
  await ensureAdminUser();

  await prisma.restaurantSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      name: process.env.RESTAURANT_NAME ?? "Rock n Logs",
      tagline: process.env.RESTAURANT_TAGLINE || null,
      description: process.env.RESTAURANT_DESCRIPTION || null,
      address: process.env.RESTAURANT_ADDRESS || null,
      phone: process.env.RESTAURANT_PHONE || null,
      whatsappPhone: process.env.RESTAURANT_NOTIFICATION_NUMBER || null,
      email: process.env.RESTAURANT_EMAIL || null,
      openingHours: process.env.RESTAURANT_HOURS || null,
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
