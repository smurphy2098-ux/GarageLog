/**
 * GarageLog — Client-safe auth utilities.
 * These functions DO NOT import Node.js built-ins or database code.
 * Safe to import from client-side components.
 */

/**
 * Extract session token from the request's cookie header.
 */
export function getTokenFromRequest(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(/garagelog_session=([^;]+)/);
  return match ? match[1] : null;
}
