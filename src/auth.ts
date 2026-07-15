/**
 * GarageLog — Authentication utilities
 *
 * Password hashing, token generation, and session management.
 * Uses Node.js built-in crypto (PBKDF2) — no third-party auth libraries.
 */

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { sql } from "~/db";

// ── Password hashing ──────────────────────────────────────────────────────────

const HASH_ALGORITHM = "scrypt";
const KEY_LENGTH = 64;
const SALT_LENGTH = 32;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

/**
 * Hash a plaintext password using scrypt with a random salt.
 * Returns a string in the format: "scrypt:$salt:$hash" (all base64url).
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = scryptSync(password, salt, KEY_LENGTH, SCRYPT_PARAMS);
  return [
    HASH_ALGORITHM,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join(":");
}

/**
 * Verify a plaintext password against a stored hash string.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== HASH_ALGORITHM) {
    return false;
  }
  const [, saltB64u, hashB64u] = parts;
  try {
    const salt = Buffer.from(saltB64u, "base64url");
    const expected = Buffer.from(hashB64u, "base64url");
    const actual = scryptSync(password, salt, KEY_LENGTH, SCRYPT_PARAMS);
    // Timing-safe comparison prevents timing attacks
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// ── Session tokens ────────────────────────────────────────────────────────────

const TOKEN_LENGTH = 48;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generate a cryptographically random session token.
 */
export function generateToken(): string {
  return randomBytes(TOKEN_LENGTH).toString("base64url");
}

/**
 * Create a new session for a user — inserts into the DB and returns the token.
 * The caller is responsible for setting the cookie on the response.
 */
export async function createSession(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const db = sql();
  await db`
    INSERT INTO sessions (user_id, token, expires_at)
    VALUES (${userId}, ${token}, ${expiresAt.toISOString()})
  `;
  return { token, expiresAt };
}

/**
 * Validate a session token — returns the user record if valid, null otherwise.
 * Automatically cleans up expired sessions.
 */
export async function validateSession(
  token: string,
): Promise<{ id: string; email: string; name: string } | null> {
  if (!token) return null;
  const db = sql();
  // Clean expired sessions opportunistically
  await db`DELETE FROM sessions WHERE expires_at < NOW()`;
  // Look up the session
  const rows = await db`
    SELECT u.id, u.email, u.name
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > NOW()
    LIMIT 1
  `;
  if (!rows.length) return null;
  return rows[0] as { id: string; email: string; name: string };
}

/**
 * Delete a session (logout).
 */
export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  const db = sql();
  await db`DELETE FROM sessions WHERE token = ${token}`;
}

// ── Auth middleware helper ────────────────────────────────────────────────────

/**
 * Extract session token from the request's cookie header.
 */
export function getTokenFromRequest(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(/garagelog_session=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Set the session cookie on a Response (for login/signup).
 */
export function setSessionCookie(response: Response, token: string, expiresAt: Date): Response {
  const expires = expiresAt.toUTCString();
  response.headers.set(
    "set-cookie",
    `garagelog_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=${expires}`,
  );
  return response;
}

/**
 * Clear the session cookie (for logout).
 */
export function clearSessionCookie(response: Response): Response {
  response.headers.set(
    "set-cookie",
    "garagelog_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  );
  return response;
}

/**
 * Require authentication — extracts and validates the session token from a
 * request. Returns the user if authenticated, or throws a redirect response.
 *
 * Usage in a server function:
 *   const user = await requireAuth(event.request);
 */
export async function requireAuth(request: Request): Promise<{ id: string; email: string; name: string }> {
  const token = getTokenFromRequest(request);
  const user = token ? await validateSession(token) : null;
  if (!user) {
    // TanStack Start server functions run on the server — we throw a Response
    // that the router can catch and redirect.
    throw new Response(null, {
      status: 302,
      headers: { location: "/login" },
    });
  }
  return user;
}