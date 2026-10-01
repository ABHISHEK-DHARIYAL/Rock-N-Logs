/**
 * Container (Composition Root)
 *
 * The ONLY file in the project that imports concrete infrastructure
 * classes (Prisma repositories, CloudinaryImageStorage, MockImageStorage,
 * WhatsAppNotificationProvider, ...) and wires them into the services API
 * routes actually depend on.
 *
 * This is a deliberately simple, hand-written form of dependency
 * injection appropriate for a project this size — no DI framework is
 * needed. Provider selection (Cloudinary vs mock, WhatsApp vs mock) is
 * decided here, once, based on whether credentials are configured
 * (see lib/env.ts), so the rest of the app is unaware of the swap.
 *
 * Services are memoized (built once, reused) since they are stateless
 * aside from their injected dependencies.
 */
import { prisma } from "./lib/prisma";
import { env } from "./lib/env";

import { PrismaMenuRepository } from "./repositories/prisma/PrismaMenuRepository";
import { PrismaBookingRepository } from "./repositories/prisma/PrismaBookingRepository";
import { PrismaAdminUserRepository } from "./repositories/prisma/PrismaAdminUserRepository";
import { PrismaImageRepository } from "./repositories/prisma/PrismaImageRepository";
import { PrismaPromotionRepository } from "./repositories/prisma/PrismaPromotionRepository";
import { PrismaGalleryRepository } from "./repositories/prisma/PrismaGalleryRepository";
import { PrismaSettingsRepository } from "./repositories/prisma/PrismaSettingsRepository";
import { PrismaMenuDocumentRepository } from "./repositories/prisma/PrismaMenuDocumentRepository";

import { CloudinaryImageStorage } from "./services/image/CloudinaryImageStorage";
import { MockImageStorage } from "./services/image/MockImageStorage";
import type { ImageStorage } from "./services/image/ImageStorage";
import { ImageService } from "./services/image/ImageService";

import { WhatsAppNotificationProvider } from "./services/notification/WhatsAppNotificationProvider";
import { MockNotificationProvider } from "./services/notification/MockNotificationProvider";
import type { NotificationProvider } from "./services/notification/NotificationProvider";
import { NotificationService } from "./services/notification/NotificationService";

import { AuthService } from "./services/auth/AuthService";
import { MenuService } from "./services/menu/MenuService";
import { BookingService } from "./services/booking/BookingService";
import { PromotionService } from "./services/promotion/PromotionService";
import { GalleryService } from "./services/gallery/GalleryService";
import { SettingsService } from "./services/settings/SettingsService";
import { InMemoryRateLimiter } from "./services/security/InMemoryRateLimiter";
import { MenuDocumentService } from "./services/menu/MenuDocumentService";

import { CloudinaryDocumentStorage } from "./services/document/CloudinaryDocumentStorage";
import { MockDocumentStorage } from "./services/document/MockDocumentStorage";
import type { DocumentStorage } from "./services/document/DocumentStorage";

// --- Repositories -----------------------------------------------------
const menuRepository = new PrismaMenuRepository(prisma);
const bookingRepository = new PrismaBookingRepository(prisma);
const adminUserRepository = new PrismaAdminUserRepository(prisma);
const imageRepository = new PrismaImageRepository(prisma);
const promotionRepository = new PrismaPromotionRepository(prisma);
const galleryRepository = new PrismaGalleryRepository(prisma);
const settingsRepository = new PrismaSettingsRepository(prisma);
const menuDocumentRepository = new PrismaMenuDocumentRepository(prisma);

// --- Infrastructure providers (chosen based on configured credentials) -
function buildImageStorage(): ImageStorage {
  if (env.cloudinary.isConfigured()) {
    return new CloudinaryImageStorage({
      cloudName: env.cloudinary.cloudName()!,
      apiKey: env.cloudinary.apiKey()!,
      apiSecret: env.cloudinary.apiSecret()!,
    });
  }
  return new MockImageStorage();
}

function buildNotificationProvider(): NotificationProvider {
  if (env.whatsapp.isConfigured()) {
    return new WhatsAppNotificationProvider({
      apiUrl: env.whatsapp.apiUrl()!,
      apiToken: env.whatsapp.apiToken()!,
      fromNumber: env.whatsapp.fromNumber()!,
    });
  }
  return new MockNotificationProvider();
}

function buildDocumentStorage(): DocumentStorage {
  // Reuses the same Cloudinary account as image uploads (Cloudinary
  // supports raw/document uploads on the same credentials), just a
  // different resource-type endpoint — see CloudinaryDocumentStorage.
  if (env.cloudinary.isConfigured()) {
    return new CloudinaryDocumentStorage({
      cloudName: env.cloudinary.cloudName()!,
      apiKey: env.cloudinary.apiKey()!,
      apiSecret: env.cloudinary.apiSecret()!,
    });
  }
  return new MockDocumentStorage();
}

const imageStorage = buildImageStorage();
const notificationProvider = buildNotificationProvider();
const documentStorage = buildDocumentStorage();

// --- Services -----------------------------------------------------------
export const authService = new AuthService(adminUserRepository, env.adminJwtSecret());
export const menuService = new MenuService(menuRepository);
export const imageService = new ImageService(imageStorage, imageRepository);
export const notificationService = new NotificationService(notificationProvider);
export const promotionService = new PromotionService(promotionRepository);
export const galleryService = new GalleryService(galleryRepository);
export const settingsService = new SettingsService(settingsRepository);
// BookingService reads the restaurant's WhatsApp number from
// SettingsService at send-time (not from env) so an admin editing it on
// /admin/settings takes effect immediately — see BookingService.submitBooking.
export const bookingService = new BookingService(bookingRepository, notificationService, settingsService);
export const menuDocumentService = new MenuDocumentService(documentStorage, menuDocumentRepository);

// Rate limiting is process-local (see InMemoryRateLimiter's docs for the
// multi-instance caveat) — exported as a singleton so all routes share
// the same counters within one server process.
export const rateLimiter = new InMemoryRateLimiter();
