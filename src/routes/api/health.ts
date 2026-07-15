import { createAPIFileRoute } from "@tanstack/react-start/api";
import { checkConnection, migrate } from "~/db";

export const Route = createAPIFileRoute("/api/health")({
  GET: async ({ request }) => {
    const db = await checkConnection();
    let migration = { ok: false, count: 0, error: "not attempted" as string | undefined };

    if (db.connected) {
      migration = await migrate();
    }

    const healthy = db.connected && migration.ok;

    return new Response(
      JSON.stringify(
        {
          status: healthy ? "healthy" : "degraded",
          database: db,
          migration,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
      {
        status: healthy ? 200 : 503,
        headers: {
          "content-type": "application/json",
          "x-garagelog-health": healthy ? "ok" : "degraded",
        },
      },
    );
  },
});