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
import { isOpenAt, parseOpeningHours } from "../../lib/openingHours";
import { createHash, randomBytes } from "node:crypto";
import { NotFoundError, ValidationError } from "../../domain/errors";
import type { BookingRepository, BookingWithPreOrders } from "../../repositories/interfaces/BookingRepository";
import type { MenuRepository } from "../../repositories/interfaces/MenuRepository";
import type { NotificationService } from "../notification/NotificationService";
import type { SettingsService } from "../settings/SettingsService";
import type { BookingStatus } from "@prisma/client";

const MIN_PARTY_SIZE = 1;
const MAX_PARTY_SIZE = 20; // above this, direct staff contact is required
const MIN_LEAD_TIME_MINUTES = 30;
const MAX_ADVANCE_DAYS = 180;
const MAX_QTY_PER_ITEM = 20;
const MAX_TOTAL_QTY = 100;

const toCents = (value: unknown) => Math.round(Number(value) * 100);
const fromCents = (cents: number) => (cents / 100).toFixed(2);
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** What a customer sees on their bill. Deliberately excludes email, full phone and internal ids. */
export interface BookingReceipt {
  reference: string;
  status: string;
  customerName: string;
  maskedPhone: string;
  partySize: number;
  requestedDate: Date;
  requestedLocal: string | null;
  specialRequest: string | null;
  hasPreOrder: boolean;
  items: { name: string; quantity: number; unitPrice: string; lineTotal: string }[];
  subtotal: string;
  total: string;
}

export interface SubmitBookingInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  partySize: number;
  requestedDate: Date;
  /** "YYYY-MM-DDTHH:mm" exactly as the customer picked it (no timezone). */
  requestedLocal?: string;
  specialRequest?: string;
  /** Only ids + quantities come from the client; names and prices are looked up here. */
  preOrderItems?: { menuItemId: string; quantity: number }[];
}

export class BookingService {
  constructor(
    private readonly bookings: BookingRepository,
    private readonly notifications: NotificationService,
    private readonly settings: SettingsService,
    private readonly menu: MenuRepository
  ) {}

  /**
   * Validates and creates a booking, then best-effort notifies the customer and restaurant.
   * Returns a one-time `receiptToken` the customer uses to view their bill; only its hash is stored.
   */
  async submitBooking(input: SubmitBookingInput) {
    // Read fresh each time (not captured at startup) so opening hours and the notification
    // number an admin edits in /admin/settings take effect immediately.
    const restaurantSettings = await this.settings.getSettings();
    this.validate(input);
    this.validateOpeningHours(input, restaurantSettings.openingHours);
    const orderLines = await this.priceOrder(input.preOrderItems);

    const receiptToken = randomBytes(24).toString("base64url"); // 192 bits, 32 chars
    const created = await this.bookings.create({
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      partySize: input.partySize,
      requestedDate: input.requestedDate,
      requestedLocal: input.requestedLocal,
      specialRequest: input.specialRequest,
      receiptTokenHash: hashToken(receiptToken),
      preOrderItems: orderLines,
    });

    await this.notifications.notifyBookingReceived(
      created.customerPhone,
      created.customerName,
      created.requestedDate
    );

    if (restaurantSettings.whatsappPhone) {
      await this.notifications.notifyRestaurantOfNewBooking(
        restaurantSettings.whatsappPhone,
        created.customerName,
        created.partySize,
        created.requestedDate,
        orderLines.reduce((sum, line) => sum + line.quantity, 0)
      );
    }

    return { booking: this.toReceipt(created), receiptToken };
  }

  /** Looks a bill up by its secret token. Returns null for unknown tokens (no hint which part was wrong). */
  async getReceipt(token: string): Promise<BookingReceipt | null> {
    const booking = await this.bookings.findByReceiptTokenHash(hashToken(token));
    return booking ? this.toReceipt(booking) : null;
  }

  /**
   * Customer path: adds dishes to an order that was already placed, identified by the secret
   * receipt token. Returns the refreshed bill, or null for an unknown token.
   */
  async addItemsByReceiptToken(token: string, lines: SubmitBookingInput["preOrderItems"]): Promise<BookingReceipt | null> {
    const booking = await this.bookings.findByReceiptTokenHash(hashToken(token));
    if (!booking) return null;
    return this.toReceipt(await this.appendItems(booking, lines));
  }

  /** Staff path: adds dishes to any open booking from /admin/bookings. */
  async addItemsToBooking(id: string, lines: SubmitBookingInput["preOrderItems"]) {
    const booking = await this.bookings.findById(id);
    if (!booking) {
      throw new NotFoundError("Booking", id);
    }
    return this.toAdminBooking(await this.appendItems(booking, lines));
  }

  /**
   * Shared by both paths: validates the add against the booking's state and the existing order,
   * prices the new lines from the database, and saves them.
   */
  private async appendItems(booking: BookingWithPreOrders, lines: SubmitBookingInput["preOrderItems"]) {
    if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
      throw new ValidationError("This booking is closed, so dishes can't be added to it. Please contact us or make a new booking.");
    }
    if (!lines || lines.length === 0) {
      throw new ValidationError("Choose at least one dish to add.");
    }

    // Limits apply to the whole order (what is already on it + what is being added).
    const onOrder = new Map<string, number>();
    let totalOnOrder = 0;
    for (const item of booking.preOrderItems) {
      totalOnOrder += item.quantity;
      if (item.menuItemId) onOrder.set(item.menuItemId, (onOrder.get(item.menuItemId) ?? 0) + item.quantity);
    }
    const adding = new Map<string, number>();
    for (const line of lines) {
      adding.set(line.menuItemId, (adding.get(line.menuItemId) ?? 0) + line.quantity);
    }
    let totalAdding = 0;
    for (const [menuItemId, quantity] of adding) {
      totalAdding += quantity;
      if ((onOrder.get(menuItemId) ?? 0) + quantity > MAX_QTY_PER_ITEM) {
        throw new ValidationError(`An order can have at most ${MAX_QTY_PER_ITEM} of any one dish.`);
      }
    }
    if (totalOnOrder + totalAdding > MAX_TOTAL_QTY) {
      throw new ValidationError(`Orders are limited to ${MAX_TOTAL_QTY} items. For larger orders, please contact us.`);
    }

    const priced = await this.priceOrder(lines);
    return this.bookings.addPreOrderItems(booking.id, priced);
  }

  /**
   * Resolves client-sent {id, quantity} lines against the live menu. Prices and names
   * always come from the database, so a tampered request cannot change what is billed.
   */
  private async priceOrder(lines: SubmitBookingInput["preOrderItems"]) {
    if (!lines || lines.length === 0) return [];

    const quantities = new Map<string, number>();
    for (const line of lines) {
      quantities.set(line.menuItemId, (quantities.get(line.menuItemId) ?? 0) + line.quantity);
    }
    let total = 0;
    for (const quantity of quantities.values()) {
      if (quantity > MAX_QTY_PER_ITEM) {
        throw new ValidationError(`You can pre-order at most ${MAX_QTY_PER_ITEM} of any one dish.`);
      }
      total += quantity;
    }
    if (total > MAX_TOTAL_QTY) {
      throw new ValidationError(`Pre-orders are limited to ${MAX_TOTAL_QTY} items. For larger orders, please contact us.`);
    }

    const items = await this.menu.findItemsByIds([...quantities.keys()]);
    const byId = new Map(items.map((item) => [item.id, item]));

    return [...quantities.entries()].map(([menuItemId, quantity]) => {
      const item = byId.get(menuItemId);
      if (!item) {
        throw new ValidationError("An item in your order is no longer on the menu. Please review your order.");
      }
      if (!item.isAvailable) {
        throw new ValidationError(`"${item.name}" is not available right now. Please remove it from your order.`);
      }
      return { menuItemId, menuItemName: item.name, quantity, priceAtOrder: Number(item.price) };
    });
  }

  private toReceipt(booking: BookingWithPreOrders): BookingReceipt {
    const items = booking.preOrderItems.map((item) => {
      const unit = toCents(item.priceAtOrder);
      return { name: item.menuItemName, quantity: item.quantity, unit, line: unit * item.quantity };
    });
    const subtotal = items.reduce((sum, item) => sum + item.line, 0);
    const digits = booking.customerPhone.replace(/\D/g, "");
    return {
      reference: booking.id.slice(-8).toUpperCase(),
      status: booking.status,
      customerName: booking.customerName,
      maskedPhone: digits.length > 4 ? `•••• ${digits.slice(-4)}` : "••••",
      partySize: booking.partySize,
      requestedDate: booking.requestedDate,
      requestedLocal: booking.requestedLocal,
      specialRequest: booking.specialRequest,
      hasPreOrder: items.length > 0,
      items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: fromCents(item.unit),
        lineTotal: fromCents(item.line),
      })),
      subtotal: fromCents(subtotal),
      total: fromCents(subtotal),
    };
  }

  /** Admin view: full booking details plus the pre-order total; never exposes the receipt token hash. */
  private toAdminBooking(booking: BookingWithPreOrders) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { receiptTokenHash, ...rest } = booking;
    const total = booking.preOrderItems.reduce((sum, item) => sum + toCents(item.priceAtOrder) * item.quantity, 0);
    return { ...rest, preOrderTotal: fromCents(total) };
  }

  async listBookings(status?: BookingStatus) {
    const bookings = await this.bookings.list(status ? { status } : undefined);
    return bookings.map((booking) => this.toAdminBooking(booking));
  }

  async getBooking(id: string) {
    const booking = await this.bookings.findById(id);
    if (!booking) {
      throw new NotFoundError("Booking", id);
    }
    return this.toAdminBooking(booking);
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

    return this.toAdminBooking(updated);
  }

  /**
   * Only accepts times inside the opening hours set in /admin/settings. The check uses the
   * wall-clock time the customer picked (requestedLocal). If the hours text can't be understood
   * the check is skipped rather than blocking every booking.
   */
  private validateOpeningHours(input: SubmitBookingInput, openingHours: string | null) {
    const schedule = parseOpeningHours(openingHours);
    if (!schedule || !input.requestedLocal) return;
    if (!isOpenAt(schedule, input.requestedLocal)) {
      throw new ValidationError(
        `We're closed at that time. Our opening hours are: ${openingHours}. Please choose a time within them.`
      );
    }
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
    if (minutesFromNow > MAX_ADVANCE_DAYS * 24 * 60) {
      throw new ValidationError(`Bookings can be made up to ${MAX_ADVANCE_DAYS} days in advance.`);
    }
    if (minutesFromNow < MIN_LEAD_TIME_MINUTES) {
      throw new ValidationError(
        `Bookings require at least ${MIN_LEAD_TIME_MINUTES} minutes' notice.`
      );
    }
  }
}
