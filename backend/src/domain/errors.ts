/**
 * Domain Error Hierarchy
 *
 * Services throw these instead of generic Errors so API route handlers can
 * translate failures into the correct HTTP status code and a safe,
 * user-facing message — without ever leaking stack traces, database
 * errors, or provider (Cloudinary/WhatsApp) internals to the client.
 *
 * Rule of thumb for where each is thrown:
 *   ValidationError    - the request/input itself is malformed
 *   NotFoundError       - a referenced entity does not exist
 *   AuthenticationError - credentials are missing/invalid
 *   AuthorizationError  - caller is authenticated but not allowed to act
 *   ConflictError        - request conflicts with current state
 *   ExternalServiceError - a downstream provider (Cloudinary, WhatsApp) failed
 */

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
  }
}

export class AuthenticationError extends DomainError {}

export class AuthorizationError extends DomainError {}

export class ConflictError extends DomainError {}

/** Wraps a failure from an external provider (Cloudinary, WhatsApp, ...). */
export class ExternalServiceError extends DomainError {
  constructor(
    public readonly provider: string,
    message: string
  ) {
    super(`${provider} error: ${message}`);
  }
}
