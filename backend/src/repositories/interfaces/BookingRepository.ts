/**
 * BookingRepository (interface)
 *
 * Data-access contract for reservations. Deliberately has no concept of
 * table availability or capacity — see BookingService for why the booking
 * system stays simple by design.
 */
import type { Booking, BookingPreOrderItem, BookingStatus } from "@prisma/client";

export type BookingWithPreOrders = Booking & { preOrderItems: BookingPreOrderItem[] };

export interface CreateBookingInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  partySize: number;
  requestedDate: Date;
  requestedLocal?: string | null;
  specialRequest?: string | null;
  receiptTokenHash: string;
  /** Name and price are resolved server-side from the menu — never taken from the client. */
  preOrderItems?: { menuItemId: string; menuItemName: string; quantity: number; priceAtOrder: number }[];
}

export interface AddPreOrderItemInput {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  priceAtOrder: number;
}

export interface BookingRepository {
  create(input: CreateBookingInput): Promise<BookingWithPreOrders>;
  findById(id: string): Promise<BookingWithPreOrders | null>;
  findByReceiptTokenHash(hash: string): Promise<BookingWithPreOrders | null>;
  list(filter?: { status?: BookingStatus }): Promise<BookingWithPreOrders[]>;
  updateStatus(id: string, status: BookingStatus): Promise<BookingWithPreOrders>;
  /**
   * Adds dishes to an existing booking. A dish already on the order at the same price just has
   * its quantity increased; otherwise a new line is created. Runs in one transaction.
   */
  addPreOrderItems(bookingId: string, items: AddPreOrderItemInput[]): Promise<BookingWithPreOrders>;
}
