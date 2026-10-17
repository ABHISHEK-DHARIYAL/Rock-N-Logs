/**
 * Shared constant: the name of the admin session cookie.
 *
 * Deliberately its own file with zero dependencies. middleware.ts (which
 * runs in the Edge runtime) and lib/adminSession.ts (which runs in the
 * Node runtime and pulls in Prisma via container.ts) both need this
 * name — keeping it isolated means the Edge bundle never accidentally
 * pulls in Node-only code through a transitive import.
 */
export const ADMIN_SESSION_COOKIE = "admin_session";
