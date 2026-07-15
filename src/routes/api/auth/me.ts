import { createAPIFileRoute } from "@tanstack/react-start/api";
import { getTokenFromRequest, validateSession } from "~/auth";

export const Route = createAPIFileRoute("/api/auth/me")({
  GET: async ({ request }) => {
    const token = getTokenFromRequest(request);
    if (!token) {
      return new Response(
        JSON.stringify({ ok: false, user: null }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    const user = await validateSession(token);
    return new Response(
      JSON.stringify({ ok: true, user }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  },
});