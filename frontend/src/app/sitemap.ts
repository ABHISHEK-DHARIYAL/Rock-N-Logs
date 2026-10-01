/**
 * Sitemap (/sitemap.xml)
 *
 * Lists every public, indexable page. Admin routes and API routes are
 * intentionally excluded — see robots.ts, which also disallows crawling
 * them. Next.js serves this at /sitemap.xml automatically because of the
 * file's name and location.
 */
import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteUrl();
  const lastModified = new Date();

  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/menu", priority: 0.9, changeFrequency: "weekly" },
    { path: "/book", priority: 0.9, changeFrequency: "monthly" },
    { path: "/restaurant", priority: 0.6, changeFrequency: "monthly" },
    { path: "/gallery", priority: 0.5, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
