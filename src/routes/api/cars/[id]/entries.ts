import { createAPIFileRoute } from "@tanstack/react-start/api";
import { sql } from "~/db";
import { getTokenFromRequest, validateSession } from "~/auth";

export const Route = createAPIFileRoute("/api/cars/$id/entries")({
  POST: async ({ request, params }) => {
    const token = getTokenFromRequest(request);
    const user = token ? await validateSession(token) : null;
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const db = sql();
    const carId = params.id;

    // Verify car ownership
    const cars = await db`
      SELECT id FROM cars WHERE id = ${carId} AND user_id = ${user.id} LIMIT 1
    `;
    if (!cars.length) {
      return new Response(JSON.stringify({ ok: false, error: "Car not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    try {
      const body = (await request.json()) as {
        entry_type: "service" | "modification" | "milestone" | "other";
        title: string;
        description?: string;
        mileage?: number;
        date?: string;
        cost?: number;
        vendor?: string;
        receipt_image_url?: string;
      };

      // Validate
      const errors: string[] = [];
      if (!body.title?.trim()) errors.push("Title is required");
      if (!["service", "modification", "milestone", "other"].includes(body.entry_type)) {
        errors.push("Valid entry type is required");
      }
      if (errors.length) {
        return new Response(JSON.stringify({ ok: false, errors }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      const entries = await db`
        INSERT INTO log_entries (car_id, user_id, entry_type, title, description, mileage, date, cost, vendor, receipt_image_url)
        VALUES (
          ${carId},
          ${user.id},
          ${body.entry_type},
          ${body.title.trim()},
          ${body.description?.trim() || null},
          ${body.mileage || null},
          ${body.date || null},
          ${body.cost || null},
          ${body.vendor?.trim() || null},
          ${body.receipt_image_url || null}
        )
        RETURNING *
      `;

      return new Response(
        JSON.stringify({ ok: true, entry: entries[0] }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to create entry" }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }
  },
});