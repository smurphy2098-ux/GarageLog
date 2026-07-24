/**
 * GarageLog — Authentication utilities
 *
 * Password hashing, token generation, and session management.
 * Uses Web Crypto APIs (SubtleCrypto) — works in both Node and browser runtimes.
 */

import { sql } from "~/db";

// ── Password hashing (Web Crypto PBKDF2) ─────────────────────────────────────

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH = "SHA-256";
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (const byte of bytes) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBuffer(b64u: string): ArrayBuffer {
  const str = atob(b64u.replace(/-/g, "+").replace(/_/g, "/"));
  const buf = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) buf[i] = str.charCodeAt(i);
  return buf.buffer;
}

async function pbkdf2(password: string, salt: ArrayBuffer): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: PBKDF2_HASH, salt, iterations: PBKDF2_ITERATIONS },
    key,
    KEY_LENGTH * 8,
  );
}

/**
 * Hash a plaintext password using PBKDF2 with a random salt.
 * Returns "pbkdf2:$salt:$hash" (base64url encoded).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const derived = await pbkdf2(password, salt.buffer);
  return [
    "pbkdf2",
    bufferToBase64url(salt.buffer),
    bufferToBase64url(derived),
  ].join(":");
}

/**
 * Verify a plaintext password against a stored hash string.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "pbkdf2") return false;
  const [, saltB64u, hashB64u] = parts;
  try {
    const salt = base64urlToBuffer(saltB64u);
    const expected = base64urlToBuffer(hashB64u);
    const actual = await pbkdf2(password, salt);
    if (actual.byteLength !== expected.byteLength) return false;
    const a = new Uint8Array(actual);
    const b = new Uint8Array(expected);
    return a.every((v, i) => v === b[i]);
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
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_LENGTH));
  return bufferToBase64url(bytes.buffer);
}

/**
 * Create a new session for a user — inserts into the DB and returns the token.
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
 */
export async function validateSession(
  token: string,
): Promise<{ id: string; email: string; name: string } | null> {
  if (!token) return null;
  const db = sql();
  await db`DELETE FROM sessions WHERE expires_at < NOW()`;
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
  response.headers.set(
    "set-cookie",
    `garagelog_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=${expiresAt.toUTCString()}`,
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
 */
export async function requireAuth(request: Request): Promise<{ id: string; email: string; name: string }> {
  const token = getTokenFromRequest(request);
  const user = token ? await validateSession(token) : null;
  if (!user) {
    throw new Response(null, {
      status: 302,
      headers: { location: "/login" },
    });
  }
  return user;
}
