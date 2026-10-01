/**
 * Server-side API client (server components only).
 *
 * Calls the Express backend directly using BACKEND_URL. Browser-side code
 * never uses this — it calls same-origin `/api/*`, which next.config.ts
 * rewrites to the backend (keeps the admin cookie first-party).
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE } from "./constants";
import type {
  Booking, GalleryPhotoWithImage, MenuCategoryWithItems, MenuDocument,
  PromotionWithImage, RestaurantSettings,
} from "./types";

const BACKEND_URL = () => (process.env.BACKEND_URL ?? "http://localhost:4000").replace(/\/$/, "");

// Render's free tier can take 30-60s to wake up; wait for it instead of failing fast.
const REQUEST_TIMEOUT_MS = 55_000;

/** Thrown when the backend is unreachable or returns an error status. */
export class ApiError extends Error {
  constructor(public readonly path: string, public readonly status: number, detail: string) {
    super(`API ${path} failed (${status || "no response"}): ${detail}`);
    this.name = "ApiError";
  }
}

async function get<T>(path: string, admin = false): Promise<T> {
  const headers: Record<string, string> = {};
  if (admin) {
    const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) redirect("/admin/login");
    headers.cookie = `${ADMIN_SESSION_COOKIE}=${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL()}${path}`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    // Shows up in Vercel's function logs — the usual culprit is a missing/wrong BACKEND_URL.
    console.error(`[api] Could not reach backend at ${BACKEND_URL()}${path}:`, error);
    throw new ApiError(path, 0, `could not reach ${BACKEND_URL()}`);
  }

  if (admin && res.status === 401) redirect("/admin/login");
  if (!res.ok) throw new ApiError(path, res.status, res.statusText);
  return res.json() as Promise<T>;
}

export const api = {
  menu: async () => (await get<{ categories: MenuCategoryWithItems[] }>("/api/menu")).categories,
  promotions: async () => (await get<{ promotions: PromotionWithImage[] }>("/api/promotions")).promotions,
  gallery: async () => (await get<{ photos: GalleryPhotoWithImage[] }>("/api/gallery")).photos,
  settings: async () => (await get<{ settings: RestaurantSettings }>("/api/settings")).settings,
  menuPdf: () => get<MenuDocument>("/api/menu-pdf"),
  adminPendingBookings: async () =>
    (await get<{ bookings: Booking[] }>("/api/admin/bookings?status=PENDING", true)).bookings,
};
