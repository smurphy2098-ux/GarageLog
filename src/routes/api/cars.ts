import { createAPIFileRoute } from "@tanstack/react-start/api";
import { sql } from "~/db";
import { getTokenFromRequest, validateSession } from "~/auth";

export const Route = createAPIFileRoute("/api/cars")({
  // Get all cars for the current user
  GET: async ({ request }) => {
    const token = getTokenFromRequest(request);
    const user = token ? await validateSession(token) : null;
    if (!user) {
      return new Response(JSON.stringify({ ok: false, cars: [] }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const db = sql();
    const cars = await db`
      SELECT c.id, c.make, c.model, c.year, c.nickname, c.mileage, c.image_url, c.color, c.vin, c.license_plate, c.created_at,
        (SELECT MAX(created_at) FROM log_entries WHERE car_id = c.id) as last_entry_date,
        (SELECT COUNT(*) FROM log_entries WHERE car_id = c.id) as entry_count,
        (SELECT COALESCE(SUM(cost), 0) FROM log_entries WHERE car_id = c.id) as total_spent
      FROM cars c
      WHERE c.user_id = ${user.id}
      ORDER BY c.created_at DESC
    `;

    return new Response(
      JSON.stringify({ ok: true, cars }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  },

  // Create a new car
  POST: async ({ request }) => {
    const token = getTokenFromRequest(request);
    const user = token ? await validateSession(token) : null;
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    try {
      const body = (await request.json()) as {
        make: string;
        model: string;
        year: number;
        nickname?: string;
        vin?: string;
        license_plate?: string;
        color?: string;
        mileage?: number;
        image_url?: string;
        notes?: string;
      };

      // Validate
      const errors: string[] = [];
      if (!body.make?.trim()) errors.push("Make is required");
      if (!body.model?.trim()) errors.push("Model is required");
      if (!body.year || body.year < 1886 || body.year > new Date().getFullYear() + 2) {
        errors.push("Valid year is required");
      }
      if (errors.length) {
        return new Response(JSON.stringify({ ok: false, errors }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      const db = sql();
      const cars = await db`
        INSERT INTO cars (user_id, make, model, year, nickname, vin, license_plate, color, mileage, image_url, notes)
        VALUES (
          ${user.id},
          ${body.make.trim()},
          ${body.model.trim()},
          ${body.year},
          ${body.nickname?.trim() || null},
          ${body.vin?.trim() || null},
          ${body.license_plate?.trim() || null},
          ${body.color?.trim() || null},
          ${body.mileage || null},
          ${body.image_url || null},
          ${body.notes || null}
        )
        RETURNING id, make, model, year, nickname, mileage, image_url, created_at
      `;

      return new Response(
        JSON.stringify({ ok: true, car: cars[0] }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to create car" }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }
  },
});