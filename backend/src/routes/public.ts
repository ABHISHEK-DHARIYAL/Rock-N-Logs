/**
 * Public (unauthenticated) API routes.
 *
 *   GET  /api/health      DB connectivity check (Render health check)
 *   GET  /api/menu        full menu
 *   GET  /api/promotions  active promotions
 *   GET  /api/gallery     gallery photos
 *   GET  /api/menu-pdf    PDF menu link
 *   GET  /api/settings    restaurant settings (name, hours, contact…)
 *   POST /api/bookings    submit a reservation request
 */
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { handle } from "../lib/asyncHandler";
import { getClientIp } from "../lib/clientIp";
import { isLikelySpam } from "../lib/spamDetection";
import { bookingService, galleryService, menuDocumentService, menuService, promotionService, rateLimiter, settingsService } from "../container";

export const publicRouter = Router();

publicRouter.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});

publicRouter.get("/menu", handle(async (_req, res) => {
  res.json({ categories: await menuService.getFullMenu() });
}));

publicRouter.get("/promotions", handle(async (_req, res) => {
  res.json({ promotions: await promotionService.getActivePromotions() });
}));

publicRouter.get("/gallery", handle(async (_req, res) => {
  res.json({ photos: await galleryService.listPhotos() });
}));

publicRouter.get("/menu-pdf", handle(async (_req, res) => {
  const document = await menuDocumentService.getCurrentDocument();
  res.json({
    url: document.url,
    originalFilename: document.originalFilename,
    fileSizeBytes: document.fileSizeBytes,
  });
}));

publicRouter.get("/settings", handle(async (_req, res) => {
  res.json({ settings: await settingsService.getSettings() });
}));

// --- Bookings -------------------------------------------------------------
const preOrderItemSchema = z.object({
  menuItemName: z.string().min(1),
  quantity: z.number().int().positive(),
  priceAtOrder: z.number().nonnegative(),
});

const submitBookingSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerEmail: z.string().email().optional().or(z.literal("")),
  partySize: z.number().int().positive(),
  requestedDate: z.string().min(1),
  specialRequest: z.string().optional(),
  preOrderItems: z.array(preOrderItemSchema).optional(),
  website: z.string().optional(), // honeypot
  formRenderedAt: z.number().optional(),
});

const MAX_SUBMISSIONS = 5;
const WINDOW_MS = 60 * 60 * 1000;

publicRouter.post("/bookings", handle(async (req, res) => {
  const parsed = submitBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid booking details." });
    return;
  }
  const body = parsed.data;
  const ip = getClientIp(req);

  const { allowed, retryAfterMs } = rateLimiter.consume(`booking:${ip}`, MAX_SUBMISSIONS, WINDOW_MS);
  if (!allowed) {
    res
      .status(429)
      .set("Retry-After", String(Math.ceil((retryAfterMs ?? WINDOW_MS) / 1000)))
      .json({ error: "Too many booking requests from this connection. Please try again later, or call us directly." });
    return;
  }

  if (isLikelySpam({ honeypot: body.website, formRenderedAt: body.formRenderedAt })) {
    res.status(201).json({ booking: { id: "unavailable" } });
    return;
  }

  const booking = await bookingService.submitBooking({
    ...body,
    customerEmail: body.customerEmail || undefined,
    requestedDate: new Date(body.requestedDate),
  });
  res.status(201).json({ booking });
}));
