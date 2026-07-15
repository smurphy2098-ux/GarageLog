import { createAPIFileRoute } from "@tanstack/react-start/api";
import { sql } from "~/db";
import { hashPassword, createSession, setSessionCookie } from "~/auth";

export const Route = createAPIFileRoute("/api/auth/signup")({
  POST: async ({ request }) => {
    try {
      const body = (await request.json()) as {
        email: string;
        password: string;
        name: string;
      };

      // Validate input
      const errors: string[] = [];
      if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        errors.push("Valid email is required");
      }
      if (!body.password || body.password.length < 8) {
        errors.push("Password must be at least 8 characters");
      }
      if (!body.name || body.name.trim().length < 1) {
        errors.push("Name is required");
      }
      if (errors.length) {
        return new Response(JSON.stringify({ ok: false, errors }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      const db = sql();

      // Check for duplicate email
      const existing = await db`
        SELECT id FROM users WHERE email = ${body.email.toLowerCase().trim()}
      `;
      if (existing.length) {
        return new Response(
          JSON.stringify({
            ok: false,
            errors: ["An account with this email already exists"],
          }),
          { status: 409, headers: { "content-type": "application/json" } },
        );
      }

      // Create user
      const passwordHash = hashPassword(body.password);
      const users = await db`
        INSERT INTO users (email, password_hash, name)
        VALUES (
          ${body.email.toLowerCase().trim()},
          ${passwordHash},
          ${body.name.trim()}
        )
        RETURNING id, email, name
      `;
      const user = users[0] as { id: string; email: string; name: string };

      // Create session
      const { token, expiresAt } = await createSession(user.id);

      // Create free subscription
      await db`
        INSERT INTO subscriptions (user_id, plan, status)
        VALUES (${user.id}, 'free', 'active')
      `;

      const response = new Response(
        JSON.stringify({ ok: true, user: { id: user.id, email: user.email, name: user.name } }),
        { status: 201, headers: { "content-type": "application/json" } },
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