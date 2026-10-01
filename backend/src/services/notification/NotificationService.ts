/**
 * Notification Service
 *
 * Business operation: notifying people about booking events. Wraps one or
 * more NotificationProvider channels behind a small, stable API so
 * BookingService never talks to WhatsApp (or any future channel)
 * directly (Dependency Inversion).
 *
 * Failures here are intentionally non-fatal to the caller: a booking
 * should still succeed even if the confirmation message fails to send.
 * Callers that care about delivery status can inspect the return value.
 */
import type { NotificationProvider } from "./NotificationProvider";

export class NotificationService {
  constructor(private readonly provider: NotificationProvider) {}

  /** Returns true if the notification was sent, false if it failed silently. */
  private async sendSafely(to: string, body: string): Promise<boolean> {
    try {
      await this.provider.send({ to, body });
      return true;
    } catch {
      // A failed notification must never fail the booking itself. The
      // caller can log/report this via the boolean return value.
      return false;
    }
  }

  async notifyBookingReceived(customerPhone: string, customerName: string, when: Date): Promise<boolean> {
    const formatted = when.toLocaleString();
    return this.sendSafely(
      customerPhone,
      `Hi ${customerName}, we've received your booking request for ${formatted}. We'll confirm shortly!`
    );
  }

  async notifyBookingConfirmed(customerPhone: string, customerName: string, when: Date): Promise<boolean> {
    const formatted = when.toLocaleString();
    return this.sendSafely(
      customerPhone,
      `Hi ${customerName}, your booking for ${formatted} is confirmed. See you soon!`
    );
  }

  async notifyBookingCancelled(customerPhone: string, customerName: string, when: Date): Promise<boolean> {
    const formatted = when.toLocaleString();
    return this.sendSafely(
      customerPhone,
      `Hi ${customerName}, your booking for ${formatted} has been cancelled. Contact us if this is unexpected.`
    );
  }

  async notifyRestaurantOfNewBooking(restaurantPhone: string, customerName: string, partySize: number, when: Date): Promise<boolean> {
    const formatted = when.toLocaleString();
    return this.sendSafely(
      restaurantPhone,
      `New booking request: ${customerName}, party of ${partySize}, for ${formatted}.`
    );
  }
}
