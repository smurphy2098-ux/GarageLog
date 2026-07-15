import { createAPIFileRoute } from "@tanstack/react-start/api";
import { getTokenFromRequest, deleteSession, clearSessionCookie } from "~/auth";

export const Route = createAPIFileRoute("/api/auth/logout")({
  POST: async ({ request }) => {
    const token = getTokenFromRequest(request);
    if (token) {
      await deleteSession(token);
    }
    const response = new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
    return clearSessionCookie(response);
  },
});