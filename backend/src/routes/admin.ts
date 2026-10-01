/**
 * Admin API routes — mounted at /api/admin.
 * `login` and `logout` are public; everything after `requireAdmin` needs a
 * valid session cookie.
 */
import { Router, type Request, type Response } from "express";
import multer from "multer";
import { z } from "zod";
import type { BookingStatus } from "@prisma/client";
import { ValidationError } from "../domain/errors";
import { handle } from "../lib/asyncHandler";
import { ADMIN_SESSION_COOKIE } from "../lib/constants";
import { env } from "../lib/env";
import { getClientIp } from "../lib/clientIp";
import { originCheck } from "../middleware/originCheck";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  authService, bookingService, galleryService, imageService, menuDocumentService,
  menuService, promotionService, rateLimiter, settingsService,
} from "../container";

export const adminRouter = Router();
adminRouter.use(originCheck);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } });
const badRequest = (res: Response, message: string) => res.status(400).json({ error: message });
const param = (req: Request, name: string) => String(req.params[name]);

// --- Login / logout (public) ----------------------------------------------
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

adminRouter.post("/login", handle(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, "Email and password are required.");
  const { email, password } = parsed.data;

  const key = `login:${getClientIp(req)}:${email.toLowerCase()}`;
  const { allowed, retryAfterMs } = rateLimiter.consume(key, MAX_ATTEMPTS, WINDOW_MS);
  if (!allowed) {
    res
      .status(429)
      .set("Retry-After", String(Math.ceil((retryAfterMs ?? WINDOW_MS) / 1000)))
      .json({ error: "Too many sign-in attempts. Please wait before trying again." });
    return;
  }

  const token = await authService.login(email, password);
  rateLimiter.reset(key);

  res.cookie(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8 * 1000, // express uses milliseconds
  });
  res.json({ success: true });
}));

adminRouter.post("/logout", (_req, res) => {
  res.clearCookie(ADMIN_SESSION_COOKIE, { path: "/", httpOnly: true, secure: env.isProduction(), sameSite: "lax" });
  res.json({ success: true });
});

// --- Everything below requires an admin session ---------------------------
adminRouter.use(requireAdmin);

// Session check (used by the frontend server components)
adminRouter.get("/session", (_req, res) => { res.json({ authenticated: true }); });

// Bookings
const VALID_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"];
adminRouter.get("/bookings", handle(async (req, res) => {
  const s = req.query.status as string | undefined;
  const status = s && VALID_STATUSES.includes(s as BookingStatus) ? (s as BookingStatus) : undefined;
  res.json({ bookings: await bookingService.listBookings(status) });
}));

adminRouter.patch("/bookings/:id", handle(async (req, res) => {
  const parsed = z.object({ status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]) }).safeParse(req.body);
  if (!parsed.success) return badRequest(res, "A valid status is required.");
  res.json({ booking: await bookingService.updateStatus(param(req, "id"), parsed.data.status) });
}));

// Menu categories + items
adminRouter.get("/menu-categories", handle(async (_req, res) => {
  const categories = await menuService.getFullMenu();
  res.json({ categories: categories.map(({ id, name, sortOrder }) => ({ id, name, sortOrder })) });
}));

adminRouter.post("/menu-categories", handle(async (req, res) => {
  const parsed = z.object({ name: z.string().min(1), sortOrder: z.number().int().optional() }).safeParse(req.body);
  if (!parsed.success) return badRequest(res, "A valid category name is required.");
  res.status(201).json({ category: await menuService.createCategory(parsed.data.name, parsed.data.sortOrder) });
}));

const itemFields = {
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().nonnegative(),
  categoryId: z.string().min(1),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  imageId: z.string().nullable().optional(),
};

adminRouter.post("/menu", handle(async (req, res) => {
  const parsed = z.object(itemFields).safeParse(req.body);
  if (!parsed.success) return badRequest(res, "Invalid menu item data.");
  res.status(201).json({ item: await menuService.createItem(parsed.data) });
}));

adminRouter.patch("/menu/:id", handle(async (req, res) => {
  const parsed = z.object(itemFields).partial().safeParse(req.body);
  if (!parsed.success) return badRequest(res, "Invalid menu item data.");
  res.json({ item: await menuService.updateItem(param(req, "id"), parsed.data) });
}));

adminRouter.delete("/menu/:id", handle(async (req, res) => {
  await menuService.deleteItem(param(req, "id"));
  res.json({ success: true });
}));

// Promotions
const promoFields = {
  title: z.string().min(1),
  description: z.string().min(1),
  isActive: z.boolean().optional(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  imageId: z.string().optional().nullable(),
};

adminRouter.get("/promotions", handle(async (_req, res) => {
  res.json({ promotions: await promotionService.listAll() });
}));

adminRouter.post("/promotions", handle(async (req, res) => {
  const parsed = z.object(promoFields).safeParse(req.body);
  if (!parsed.success) return badRequest(res, "Invalid promotion data.");
  const body = parsed.data;
  const promotion = await promotionService.create({
    ...body,
    startsAt: body.startsAt ? new Date(body.startsAt) : null,
    endsAt: body.endsAt ? new Date(body.endsAt) : null,
  });
  res.status(201).json({ promotion });
}));

adminRouter.patch("/promotions/:id", handle(async (req, res) => {
  const parsed = z.object(promoFields).partial().safeParse(req.body);
  if (!parsed.success) return badRequest(res, "Invalid promotion data.");
  const body = parsed.data;
  const promotion = await promotionService.update(param(req, "id"), {
    ...body,
    startsAt: body.startsAt === undefined ? undefined : body.startsAt ? new Date(body.startsAt) : null,
    endsAt: body.endsAt === undefined ? undefined : body.endsAt ? new Date(body.endsAt) : null,
  });
  res.json({ promotion });
}));

adminRouter.delete("/promotions/:id", handle(async (req, res) => {
  await promotionService.delete(param(req, "id"));
  res.json({ success: true });
}));

// Gallery
adminRouter.get("/gallery", handle(async (_req, res) => {
  res.json({ photos: await galleryService.listPhotos() });
}));

adminRouter.post("/gallery", handle(async (req, res) => {
  const parsed = z.object({
    imageId: z.string().min(1),
    caption: z.string().optional(),
    sortOrder: z.number().int().optional(),
  }).safeParse(req.body);
  if (!parsed.success) return badRequest(res, "An image is required.");
  const { imageId, caption, sortOrder } = parsed.data;
  res.status(201).json({ photo: await galleryService.addPhoto(imageId, caption, sortOrder) });
}));

adminRouter.delete("/gallery/:id", handle(async (req, res) => {
  await galleryService.removePhoto(param(req, "id"));
  res.json({ success: true });
}));

// Settings
adminRouter.get("/settings", handle(async (_req, res) => {
  res.json({ settings: await settingsService.getSettings() });
}));

adminRouter.patch("/settings", handle(async (req, res) => {
  const parsed = z.object({
    name: z.string().min(1).optional(),
    tagline: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    whatsappPhone: z.string().optional().nullable(),
    email: z.string().email().optional().or(z.literal("")).nullable(),
    openingHours: z.string().optional().nullable(),
  }).safeParse(req.body);
  if (!parsed.success) return badRequest(res, "Invalid settings data.");
  res.json({ settings: await settingsService.updateSettings(parsed.data) });
}));

// Images
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

adminRouter.get("/images", handle(async (_req, res) => {
  res.json({ images: await imageService.listRecentImages() });
}));

adminRouter.post("/images", upload.single("file"), handle(async (req, res) => {
  const file = req.file;
  if (!file) throw new ValidationError("An image file is required.");
  if (!IMAGE_TYPES.includes(file.mimetype)) throw new ValidationError("Only JPEG, PNG, WEBP, or GIF images are allowed.");
  if (file.size > MAX_IMAGE_BYTES) throw new ValidationError("Image must be under 5MB.");
  const altText = typeof req.body?.altText === "string" ? req.body.altText : undefined;
  res.status(201).json({ image: await imageService.uploadImage(file.buffer, file.originalname, altText) });
}));

adminRouter.delete("/images/:id", handle(async (req, res) => {
  await imageService.deleteImage(param(req, "id"));
  res.json({ success: true });
}));

// PDF menu
adminRouter.get("/menu-pdf", handle(async (_req, res) => {
  res.json({ document: await menuDocumentService.getCurrentDocument() });
}));

adminRouter.post("/menu-pdf", upload.single("file"), handle(async (req, res) => {
  const file = req.file;
  if (!file) throw new ValidationError("A PDF file is required.");
  const document = await menuDocumentService.replaceDocument(file.buffer, file.originalname, file.mimetype);
  res.status(201).json({ document });
}));

adminRouter.delete("/menu-pdf", handle(async (_req, res) => {
  await menuDocumentService.removeDocument();
  res.json({ success: true });
}));
