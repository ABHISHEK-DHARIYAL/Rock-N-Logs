/** Public URL of this frontend (used for sitemap, robots, metadata). No trailing slash. */
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
