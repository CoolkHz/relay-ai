import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/auth/api-key";
import { db } from "@/lib/db";
import { groups } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  // Validate API Key
  const authHeader = request.headers.get("Authorization");
  const apiKey = authHeader?.replace("Bearer ", "");
  const auth = await validateApiKey(apiKey ?? null);

  if (!auth) {
    return Response.json(
      { error: { message: "Invalid API key", type: "invalid_request_error" } },
      { status: 401 }
    );
  }

  // Get all active groups (exposed as models)
  const activeGroups = await db.select().from(groups).where(eq(groups.status, "active")).execute();

  const models = activeGroups.map((g) => ({
    id: g.name,
    object: "model",
    created: Math.floor(g.createdAt.getTime() / 1000),
    owned_by: "relay-ai",
  }));

  return Response.json({
    object: "list",
    data: models,
  });
}
