import { createAPIFileRoute } from "@tanstack/react-start/api";
import { getTokenFromRequest, validateSession } from "~/auth";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const UPLOADS_DIR = "/home/team/shared/uploads";

export const Route = createAPIFileRoute("/api/upload")({
  POST: async ({ request }) => {
    // Auth check
    const token = getTokenFromRequest(request);
    const user = token ? await validateSession(token) : null;
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    try {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return new Response(JSON.stringify({ ok: false, error: "No file provided" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        return new Response(JSON.stringify({ ok: false, error: "Invalid file type. Use JPEG, PNG, WebP, or GIF." }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return new Response(JSON.stringify({ ok: false, error: "File too large. Max 10MB." }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      // Ensure uploads dir exists
      await mkdir(UPLOADS_DIR, { recursive: true });

      // Save file
      const ext = file.type.split("/")[1] || "jpg";
      const filename = `${randomUUID()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(join(UPLOADS_DIR, filename), buffer);

      return new Response(
        JSON.stringify({ ok: true, url: `/uploads/${filename}` }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ ok: false, error: "Upload failed" }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }
  },
});