import { createAPIFileRoute } from "@tanstack/react-start/api";
import { sql } from "~/db";

export const Route = createAPIFileRoute("/api/waitlist")({
  POST: async ({ request }) => {
    try {
      const body = (await request.json()) as {
        email: string;
        name: string;
        referral_source?: string;
      };

      // Validate
      const errors: string[] = [];
      if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        errors.push("Valid email is required");
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

      // Check for duplicate
      const existing = await db`
        SELECT id FROM waitlist WHERE email = ${body.email.toLowerCase().trim()}
      `;
      if (existing.length) {
        return new Response(
          JSON.stringify({
            ok: false,
            errors: ["You're already on the waitlist! We'll be in touch soon."],
          }),
          { status: 409, headers: { "content-type": "application/json" } },
        );
      }

      // Insert
      await db`
        INSERT INTO waitlist (email, name, referral_source)
        VALUES (
          ${body.email.toLowerCase().trim()},
          ${body.name.trim()},
          ${body.referral_source || null}
        )
      `;

      return new Response(
        JSON.stringify({ ok: true, message: "You're on the list! We'll notify you when GarageLog launches." }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ ok: false, errors: ["An unexpected error occurred"] }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }
  },
});