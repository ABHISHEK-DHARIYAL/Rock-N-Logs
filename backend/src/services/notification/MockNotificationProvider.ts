/**
 * MockNotificationProvider
 *
 * Fallback NotificationProvider used whenever WhatsApp credentials are not
 * configured (see the factory in NotificationService.ts). Logs the
 * message server-side instead of sending it, so the booking flow can be
 * developed and demoed end-to-end without a real WhatsApp Business
 * account.
 */
import type { NotificationProvider, NotificationMessage } from "./NotificationProvider";

export class MockNotificationProvider implements NotificationProvider {
  async send(message: NotificationMessage): Promise<void> {
    console.log(`[mock-notification] to=${message.to} body="${message.body}"`);
  }
}
