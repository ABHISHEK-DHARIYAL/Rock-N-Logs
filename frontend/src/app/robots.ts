/**
 * Robots (/robots.txt)
 *
 * Blocks crawlers from indexing the admin panel and raw API routes —
 * both are already access-controlled by middleware.ts, but keeping them
 * out of search results is good hygiene regardless (an unauthenticated
 * crawler hitting /admin/login shouldn't rank in search results, and API
 * JSON responses have no business being indexed).
 */
import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
