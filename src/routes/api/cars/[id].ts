import { createAPIFileRoute } from "@tanstack/react-start/api";
import { sql } from "~/db";
import { getTokenFromRequest, validateSession } from "~/auth";

export const Route = createAPIFileRoute("/api/cars/$id")({
  // Get car details with log entries
  GET: async ({ request, params }) => {
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

    // Get car
    const cars = await db`
      SELECT * FROM cars WHERE id = ${carId} AND user_id = ${user.id} LIMIT 1
    `;
    if (!cars.length) {
      return new Response(JSON.stringify({ ok: false, error: "Car not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    // Get log entries
    const entries = await db`
      SELECT * FROM log_entries
      WHERE car_id = ${carId}
      ORDER BY date DESC, created_at DESC
    `;

    // Compute stats
    const stats = await db`
      SELECT
        COUNT(*) as entry_count,
        COALESCE(SUM(cost), 0) as total_spent,
        MIN(mileage) as min_mileage,
        MAX(mileage) as max_mileage
      FROM log_entries
      WHERE car_id = ${carId}
    `;

    const car = cars[0] as Record<string, unknown>;
    const stat = stats[0] as Record<string, unknown>;

    return new Response(
      JSON.stringify({
        ok: true,
        car,
        entries,
        stats: {
          entry_count: Number(stat.entry_count),
          total_spent: Number(stat.total_spent),
          miles_driven: stat.min_mileage && stat.max_mileage
            ? Number(stat.max_mileage) - Number(stat.min_mileage)
            : 0,
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  },
});