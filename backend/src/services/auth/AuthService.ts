/**
 * Auth Service
 *
 * Business operation: admin authentication. Owns password hashing/
 * verification and session-token issuance so no other layer touches
 * bcrypt or JWT directly.
 *
 * Sessions are stateless signed JWTs stored in an httpOnly cookie
 * (see api/admin/login/route.ts and middleware.ts) — there is no server
 * session store to keep this simple, matching the "avoid over-engineering"
 * guidance for a project this size.
 */
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { AuthenticationError } from "../../domain/errors";
import type { AdminUserRepository } from "../../repositories/interfaces/AdminUserRepository";

const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8 hours

export interface AdminSessionPayload {
  sub: string; // admin user id
  email: string;
}

export class AuthService {
  constructor(
    private readonly admins: AdminUserRepository,
    private readonly jwtSecret: string
  ) {}

  /** Verifies email/password and returns a signed session token on success. */
  async login(email: string, password: string): Promise<string> {
    const admin = await this.admins.findByEmail(email.toLowerCase().trim());
    if (!admin) {
      // Same error for "no such user" and "wrong password" — never reveal
      // which one it was, to avoid leaking valid admin emails.
      throw new AuthenticationError("Invalid email or password.");
    }

    const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordMatches) {
      throw new AuthenticationError("Invalid email or password.");
    }

    return this.issueSessionToken({ sub: admin.id, email: admin.email });
  }

  async issueSessionToken(payload: AdminSessionPayload): Promise<string> {
    const secretKey = new TextEncoder().encode(this.jwtSecret);
    return new SignJWT({ email: payload.email })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
      .sign(secretKey);
  }

  /** Verifies a session token, returning its payload or null if invalid/expired. */
  async verifySessionToken(token: string): Promise<AdminSessionPayload | null> {
    try {
      const secretKey = new TextEncoder().encode(this.jwtSecret);
      const { payload } = await jwtVerify(token, secretKey);
      if (!payload.sub || typeof payload.email !== "string") return null;
      return { sub: payload.sub, email: payload.email };
    } catch {
      return null;
    }
  }

  async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, 12);
  }
}
