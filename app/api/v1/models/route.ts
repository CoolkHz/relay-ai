import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/auth/api-key";
import { db } from "@/lib/db";
import { groups } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { openaiErrorResponse } from "@/lib/utils/openai";
import { extractBearerToken } from "@/lib/gateway/auth";

export async function GET(request: NextRequest) {
  // Validate API Key
  const apiKey = extractBearerToken(request.headers.get("Authorization"));
  const auth = await validateApiKey(apiKey ?? null);

  if (!auth) {
    return openaiErrorResponse("Invalid API key", "invalid_request_error", 401);
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
