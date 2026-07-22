import { createAPIFileRoute } from "@tanstack/react-start/api";
import { getTokenFromRequest, validateSession } from "~/auth";
import { simulateExtraction } from "~/lib/ai-receipt";

export const Route = createAPIFileRoute("/api/ai/extract-receipt")({
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
      // In production: read the uploaded image file and pass it to a vision API.
      // For MVP: return a simulated extraction for demo purposes.
      // The real implementation would:
      // 1. Parse formData for the image
      // 2. Save it temporarily
      // 3. Call a vision API with the image
      // 4. Parse the response into structured data

      const extraction = simulateExtraction();

      return new Response(
        JSON.stringify({ ok: true, extraction }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ ok: false, error: "Extraction failed" }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }
  },
});