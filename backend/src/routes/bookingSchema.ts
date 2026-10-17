/**
 * Request schema for POST /api/bookings — strict (unknown keys rejected) and length-capped.
 */
import { z } from "zod";

// Strip control characters (Postgres rejects NUL bytes; WhatsApp bodies shouldn't carry them)
// and collapse whitespace. `multiline` keeps line breaks for free-text fields.
const cleanLine = (value: string) => value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
const cleanText = (value: string) =>
  value.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, " ").replace(/[ \t]+/g, " ").trim();

// Only ids and quantities are accepted. Names and prices are looked up on the server,
// so a tampered request cannot change what gets billed.
const preOrderItemSchema = z.strictObject({
  menuItemId: z.string().min(1).max(40),
  quantity: z.number().int().min(1).max(20),
});

export const submitBookingSchema = z.strictObject({
  customerName: z.string().max(100).transform(cleanLine).pipe(z.string().min(1).max(100)),
  customerPhone: z.string().max(25).transform(cleanLine).pipe(z.string().regex(/^[+0-9 ()\-.]{7,20}$/)),
  customerEmail: z.string().max(254).email().optional().or(z.literal("")),
  partySize: z.number().int().positive().max(100),
  requestedDate: z.string().min(1).max(40),
  // The exact date/time the customer picked (wall clock). Required: opening hours are checked against it.
  requestedLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  specialRequest: z.string().max(500).transform(cleanText).optional(),
  preOrderItems: z.array(preOrderItemSchema).max(40).optional(),
  website: z.string().max(200).optional(), // honeypot
  formRenderedAt: z.number().optional(),
});


/** Body for adding dishes to an order that was already placed. */
export const addItemsSchema = z.strictObject({
  items: z.array(preOrderItemSchema).min(1).max(40),
});
