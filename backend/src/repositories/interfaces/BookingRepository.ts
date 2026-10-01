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
  specialRequest?: string | null;
  preOrderItems?: { menuItemName: string; quantity: number; priceAtOrder: number }[];
}

export interface BookingRepository {
  create(input: CreateBookingInput): Promise<BookingWithPreOrders>;
  findById(id: string): Promise<BookingWithPreOrders | null>;
  list(filter?: { status?: BookingStatus }): Promise<BookingWithPreOrders[]>;
  updateStatus(id: string, status: BookingStatus): Promise<BookingWithPreOrders>;
}
