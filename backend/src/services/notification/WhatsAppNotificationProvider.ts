/**
 * WhatsAppNotificationProvider
 *
 * NotificationProvider implementation that sends messages through a
 * WhatsApp Business API-compatible HTTP endpoint. This is the only file
 * that knows the shape of that API — everything else just calls
 * NotificationProvider.send().
 */
import { ExternalServiceError } from "../../domain/errors";
import type { NotificationProvider, NotificationMessage } from "./NotificationProvider";

interface WhatsAppCredentials {
  apiUrl: string;
  apiToken: string;
  fromNumber: string;
}

export class WhatsAppNotificationProvider implements NotificationProvider {
  constructor(private readonly credentials: WhatsAppCredentials) {}

  async send(message: NotificationMessage): Promise<void> {
    const response = await fetch(this.credentials.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.credentials.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.credentials.fromNumber,
        to: message.to,
        type: "text",
        text: { body: message.body },
      }),
    });

    if (!response.ok) {
      throw new ExternalServiceError("WhatsApp", `send failed with status ${response.status}`);
    }
  }
}
