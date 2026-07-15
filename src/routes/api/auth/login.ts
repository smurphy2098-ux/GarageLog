import { createAPIFileRoute } from "@tanstack/react-start/api";
import { sql } from "~/db";
import { verifyPassword, createSession, setSessionCookie } from "~/auth";

export const Route = createAPIFileRoute("/api/auth/login")({
  POST: async ({ request }) => {
    try {
      const body = (await request.json()) as {
        email: string;
        password: string;
      };

      // Validate input
      if (!body.email || !body.password) {
        return new Response(
          JSON.stringify({ ok: false, errors: ["Email and password are required"] }),
          { status: 400, headers: { "content-type": "application/json" } },
        );
      }

      const db = sql();

      // Look up user
      const users = await db`
        SELECT id, email, name, password_hash FROM users
        WHERE email = ${body.email.toLowerCase().trim()}
        LIMIT 1
      `;

      if (!users.length) {
        return new Response(
          JSON.stringify({ ok: false, errors: ["Invalid email or password"] }),
          { status: 401, headers: { "content-type": "application/json" } },
        );
      }

      const user = users[0] as {
        id: string;
        email: string;
        name: string;
        password_hash: string;
      };

      // Verify password
      if (!verifyPassword(body.password, user.password_hash)) {
        return new Response(
          JSON.stringify({ ok: false, errors: ["Invalid email or password"] }),
          { status: 401, headers: { "content-type": "application/json" } },
        );
      }

      // Create session
      const { token, expiresAt } = await createSession(user.id);

      const response = new Response(
        JSON.stringify({
          ok: true,
          user: { id: user.id, email: user.email, name: user.name },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
      return setSessionCookie(response, token, expiresAt);
    } catch (err) {
      return new Response(
        JSON.stringify({ ok: false, errors: ["An unexpected error occurred"] }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }
  },
});