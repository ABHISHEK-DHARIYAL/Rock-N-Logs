import "dotenv/config";
import { createApp } from "./app";
import { env } from "./lib/env";
import { prisma } from "./lib/prisma";
import { ensureAdminUser } from "./lib/bootstrap";

env.adminJwtSecret(); // fail fast if the secret is missing

const app = createApp();
const server = app.listen(env.port(), () => {
  console.log(`Rock n Logs API listening on :${env.port()} (allowed origins: ${env.frontendOrigins().join(", ")})`);
  // Don't block (or crash) startup if the DB is briefly unreachable — log and carry on.
  ensureAdminUser().catch((error) => console.error("[bootstrap] Admin setup failed:", error));
});

const shutdown = () => {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
