/**
 * NotificationProvider (interface)
 *
 * A single channel capable of sending a text notification. New channels
 * (Email, SMS) are added by writing a new class that implements this
 * interface — NotificationService and BookingService never change
 * (Open/Closed Principle).
 */
export interface NotificationMessage {
  to: string;
  body: string;
}

export interface NotificationProvider {
  send(message: NotificationMessage): Promise<void>;
}
