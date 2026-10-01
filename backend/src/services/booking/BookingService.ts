/**
 * Booking Service
 *
 * Business operation: table reservations.
 *
 * IMPORTANT ARCHITECTURAL NOTE: this system intentionally does NOT
 * implement smart table availability, capacity checks, or double-booking
 * prevention. Every request is accepted as PENDING and a staff member
 * reviews/confirms it manually from /admin/bookings. This is a deliberate
 * scope decision (see spec section R), not an oversight — do not add
 * availability logic here.
 *
 * Depends on BookingRepository and NotificationService via constructor
 * injection (Dependency Inversion), so business rules can be unit tested
 * with fakes for both.
 */
import { NotFoundError, ValidationError } from "../../domain/errors";
import type { BookingRepository, CreateBookingInput } from "../../repositories/interfaces/BookingRepository";
import type { NotificationService } from "../notification/NotificationService";
import type { SettingsService } from "../settings/SettingsService";
import type { BookingStatus } from "@prisma/client";

const MIN_PARTY_SIZE = 1;
const MAX_PARTY_SIZE = 20; // above this, direct staff contact is required
const MIN_LEAD_TIME_MINUTES = 30;

export interface SubmitBookingInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  partySize: number;
  requestedDate: Date;
  specialRequest?: string;
  preOrderItems?: { menuItemName: string; quantity: number; priceAtOrder: number }[];
}

export class BookingService {
  constructor(
    private readonly bookings: BookingRepository,
    private readonly notifications: NotificationService,
    private readonly settings: SettingsService
  ) {}

  /** Validates and creates a booking, then best-effort notifies the customer and restaurant. */
  async submitBooking(input: SubmitBookingInput) {
    this.validate(input);

    const created = await this.bookings.create(input as CreateBookingInput);

    await this.notifications.notifyBookingReceived(
      created.customerPhone,
      created.customerName,
      created.requestedDate
    );

    // Read fresh each time (rather than captured once at startup) so a
    // number an admin updates from /admin/settings takes effect
    // immediately, without restarting the server.
    const restaurantSettings = await this.settings.getSettings();
    if (restaurantSettings.whatsappPhone) {
      await this.notifications.notifyRestaurantOfNewBooking(
        restaurantSettings.whatsappPhone,
        created.customerName,
        created.partySize,
        created.requestedDate
      );
    }

    return created;
  }

  async listBookings(status?: BookingStatus) {
    return this.bookings.list(status ? { status } : undefined);
  }

  async getBooking(id: string) {
    const booking = await this.bookings.findById(id);
    if (!booking) {
      throw new NotFoundError("Booking", id);
    }
    return booking;
  }

  /** Transitions a booking's status and notifies the customer when relevant. */
  async updateStatus(id: string, status: BookingStatus) {
    const existing = await this.bookings.findById(id);
    if (!existing) {
      throw new NotFoundError("Booking", id);
    }

    const updated = await this.bookings.updateStatus(id, status);

    if (status === "CONFIRMED") {
      await this.notifications.notifyBookingConfirmed(
        updated.customerPhone,
        updated.customerName,
        updated.requestedDate
      );
    } else if (status === "CANCELLED") {
      await this.notifications.notifyBookingCancelled(
        updated.customerPhone,
        updated.customerName,
        updated.requestedDate
      );
    }

    return updated;
  }

  private validate(input: SubmitBookingInput) {
    if (!input.customerName?.trim()) {
      throw new ValidationError("Name is required.");
    }
    if (!input.customerPhone?.trim()) {
      throw new ValidationError("Phone number is required.");
    }
    if (!Number.isInteger(input.partySize) || input.partySize < MIN_PARTY_SIZE) {
      throw new ValidationError(`Party size must be at least ${MIN_PARTY_SIZE}.`);
    }
    if (input.partySize > MAX_PARTY_SIZE) {
      throw new ValidationError(
        `For parties larger than ${MAX_PARTY_SIZE}, please contact us directly.`
      );
    }
    if (!(input.requestedDate instanceof Date) || Number.isNaN(input.requestedDate.getTime())) {
      throw new ValidationError("A valid date and time is required.");
    }
    const minutesFromNow = (input.requestedDate.getTime() - Date.now()) / 60000;
    if (minutesFromNow < MIN_LEAD_TIME_MINUTES) {
      throw new ValidationError(
        `Bookings require at least ${MIN_LEAD_TIME_MINUTES} minutes' notice.`
      );
    }
  }
}
