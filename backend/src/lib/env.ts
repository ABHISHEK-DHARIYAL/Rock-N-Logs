/**
 * Environment Configuration
 *
 * Centralizes access to process.env so the rest of the app never reads
 * `process.env.X` directly. This keeps secret names in one place and lets
 * services detect "credentials not configured" and fall back to mock
 * providers (see ImageService / NotificationService factories) instead of
 * crashing at startup — useful for local development and demos.
 */

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

function required(name: string): string {
  const value = optional(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: () => Number(optional("PORT") ?? 4000),
  isProduction: () => process.env.NODE_ENV === "production",
  /** Comma-separated list of allowed frontend origins (CORS + CSRF origin check). */
  frontendOrigins: () =>
    (optional("FRONTEND_URL") ?? "http://localhost:3000")
      .split(",")
      .map((o) => o.trim().replace(/\/$/, ""))
      .filter(Boolean),

  adminJwtSecret: () => required("ADMIN_JWT_SECRET"),
  /**
   * Admin account managed from env vars. Returns null unless BOTH are set —
   * we never create an admin with a built-in default password on a public deploy.
   * Email is normalised (trim + lowercase) because AuthService.login() does the same.
   */
  adminCredentials: () => {
    const email = optional("ADMIN_SEED_EMAIL")?.trim().toLowerCase();
    const password = optional("ADMIN_SEED_PASSWORD");
    return email && password ? { email, password } : null;
  },

  cloudinary: {
    cloudName: () => optional("CLOUDINARY_CLOUD_NAME"),
    apiKey: () => optional("CLOUDINARY_API_KEY"),
    apiSecret: () => optional("CLOUDINARY_API_SECRET"),
    isConfigured: () =>
      Boolean(
        optional("CLOUDINARY_CLOUD_NAME") &&
          optional("CLOUDINARY_API_KEY") &&
          optional("CLOUDINARY_API_SECRET")
      ),
  },

  whatsapp: {
    apiUrl: () => optional("WHATSAPP_API_URL"),
    apiToken: () => optional("WHATSAPP_API_TOKEN"),
    fromNumber: () => optional("WHATSAPP_FROM_NUMBER"),
    restaurantNumber: () => optional("RESTAURANT_NOTIFICATION_NUMBER"),
    isConfigured: () =>
      Boolean(
        optional("WHATSAPP_API_URL") &&
          optional("WHATSAPP_API_TOKEN") &&
          optional("WHATSAPP_FROM_NUMBER")
      ),
  },
};
