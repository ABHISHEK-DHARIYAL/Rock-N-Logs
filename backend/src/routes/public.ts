/**
 * Public (unauthenticated) API routes.
 *
 *   GET  /api/health      DB connectivity check (Render health check)
 *   GET  /api/menu        full menu
 *   GET  /api/promotions  active promotions
 *   GET  /api/gallery     gallery photos
 *   GET  /api/menu-pdf    PDF menu link
 *   GET  /api/settings    restaurant settings (name, hours, contact…)
 *   POST /api/bookings    submit a reservation request (optionally with a menu pre-order)
 *   GET  /api/bookings/receipt/:token   customer's bill, by secret token
 *   POST /api/bookings/receipt/:token/items   add more dishes to an order already placed
 */
import { parseOpeningHours } from "../lib/openingHours";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { handle } from "../lib/asyncHandler";
import { DB_UNAVAILABLE_CODES, SCHEMA_OUTDATED_CODES, prismaCode } from "../lib/apiError";
import { getClientIp } from "../lib/clientIp";
import { isLikelySpam } from "../lib/spamDetection";
import { addItemsSchema, submitBookingSchema } from "./bookingSchema";
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

// Owner-facing diagnostic: open /api/health/db in a browser after a deploy. It touches every table
// and column the booking flow needs, so "bookings fail with a 500" can be told apart from
// "the database wasn't updated". Reveals nothing beyond a status and the fix.
publicRouter.get("/health/db", async (req, res) => {
  const { allowed } = rateLimiter.consume(`health-db:${getClientIp(req)}`, 20, 60_000);
  if (!allowed) {
    res.status(429).json({ status: "rate-limited" });
    return;
  }
  try {
    await prisma.booking.findFirst({ select: { id: true, requestedDate: true, requestedLocal: true, receiptTokenHash: true, specialRequest: true } });
    await prisma.bookingPreOrderItem.findFirst({ select: { id: true, menuItemId: true, menuItemName: true, quantity: true, priceAtOrder: true } });
    await prisma.menuItem.findFirst({ select: { id: true, sortOrder: true, isAvailable: true, createdAt: true } });
    await prisma.restaurantSettings.findFirst({ select: { id: true, openingHours: true, whatsappPhone: true } });
    res.json({ status: "ok", schema: "up to date" });
  } catch (error) {
    console.error("Schema check failed:", error);
    const code = prismaCode(error);
    if (code && SCHEMA_OUTDATED_CODES.includes(code)) {
      res.status(503).json({ status: "schema-out-of-date", fix: "Run `npx prisma db push` against the production database (it adds the missing tables/columns without deleting data), then redeploy." });
    } else if (code && DB_UNAVAILABLE_CODES.includes(code)) {
      res.status(503).json({ status: "database-unreachable", fix: "Check DATABASE_URL on Render and that the database is running (free databases can be paused)." });
    } else {
      res.status(500).json({ status: "error", fix: "See the Render logs for the line starting with 'Schema check failed'." });
    }
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
  const settings = await settingsService.getSettings();
  // bookingSchedule lets the booking form only offer times the restaurant is open (null = no limit).
  res.json({ settings, bookingSchedule: parseOpeningHours(settings.openingHours) });
}));

// --- Bookings -------------------------------------------------------------
const MAX_SUBMISSIONS = 5;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_RECEIPT_LOOKUPS = 60;
const RECEIPT_WINDOW_MS = 10 * 60 * 1000;
const RECEIPT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

publicRouter.post("/bookings", handle(async (req, res) => {
  const parsed = submitBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid booking details. Please check your name, phone number and order." });
    return;
  }
  const { website, formRenderedAt, ...body } = parsed.data;
  const ip = getClientIp(req);

  const { allowed, retryAfterMs } = rateLimiter.consume(`booking:${ip}`, MAX_SUBMISSIONS, WINDOW_MS);
  if (!allowed) {
    res
      .status(429)
      .set("Retry-After", String(Math.ceil((retryAfterMs ?? WINDOW_MS) / 1000)))
      .json({ error: "Too many booking requests from this connection. Please try again later, or call us directly." });
    return;
  }

  if (isLikelySpam({ honeypot: website, formRenderedAt })) {
    res.status(201).json({ booking: { id: "unavailable" } });
    return;
  }

  const { booking, receiptToken } = await bookingService.submitBooking({
    ...body,
    customerEmail: body.customerEmail || undefined,
    requestedDate: new Date(body.requestedDate),
  });
  // The token is returned exactly once; it is the customer's key to their bill.
  res.set("Cache-Control", "no-store").status(201).json({ booking, receiptToken });
}));

// Customer bill lookup. The 192-bit token is the credential, so this endpoint is
// rate limited per IP, never cached, and returns a trimmed view (no email, masked phone).
publicRouter.get("/bookings/receipt/:token", handle(async (req, res) => {
  const ip = getClientIp(req);
  const { allowed, retryAfterMs } = rateLimiter.consume(`receipt:${ip}`, MAX_RECEIPT_LOOKUPS, RECEIPT_WINDOW_MS);
  res.set("Cache-Control", "no-store");
  if (!allowed) {
    res.status(429).set("Retry-After", String(Math.ceil((retryAfterMs ?? RECEIPT_WINDOW_MS) / 1000))).json({ error: "Too many requests. Please try again shortly." });
    return;
  }

  const token = String(req.params.token);
  const receipt = RECEIPT_TOKEN_PATTERN.test(token) ? await bookingService.getReceipt(token) : null;
  if (!receipt) {
    res.status(404).json({ error: "We couldn't find that booking. Check the link you were given." });
    return;
  }
  res.json({ receipt });
}));

// Add more dishes to an order that was already placed. Same credential as the bill (the secret
// token), same protections: rate limited per IP, uncacheable, prices always taken from the database.
publicRouter.post("/bookings/receipt/:token/items", handle(async (req, res) => {
  res.set("Cache-Control", "no-store");
  const { allowed, retryAfterMs } = rateLimiter.consume(`order-add:${getClientIp(req)}`, MAX_RECEIPT_LOOKUPS, RECEIPT_WINDOW_MS);
  if (!allowed) {
    res.status(429).set("Retry-After", String(Math.ceil((retryAfterMs ?? RECEIPT_WINDOW_MS) / 1000))).json({ error: "Too many requests. Please try again shortly." });
    return;
  }

  const parsed = addItemsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid order. Please choose the dishes again." });
    return;
  }

  const token = String(req.params.token);
  const receipt = RECEIPT_TOKEN_PATTERN.test(token) ? await bookingService.addItemsByReceiptToken(token, parsed.data.items) : null;
  if (!receipt) {
    res.status(404).json({ error: "We couldn't find that booking. Check the link you were given." });
    return;
  }
  res.json({ receipt });
}));
