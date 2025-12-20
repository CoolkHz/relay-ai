import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { channels } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { parseRequestBody, jsonError, jsonSuccess } from "@/lib/utils/api";
import { channelCreateSchema, validateForm } from "@/lib/validations";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Unauthorized", 401);
  }

  const list = await db.query.channels.findMany({
    orderBy: (channels, { desc }) => [desc(channels.createdAt)],
  });

  // Hide API keys
  const safeList = list.map((c) => ({ ...c, apiKey: "***" }));
  return jsonSuccess({ data: safeList });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Unauthorized", 401);
  }

  const parsed = await parseRequestBody(request);
  if ("error" in parsed) {
    return parsed.error;
  }

  const body = parsed.data as Record<string, unknown>;

  // Prepare form data for validation
  const formData = {
    name: body.name,
    type: body.type,
    baseUrl: body.baseUrl,
    apiKey: body.apiKey,
    models: typeof body.models === "string" ? body.models : "",
    weight: Number(body.weight) || 1,
    priority: Number(body.priority) || 0,
  };

  const validation = validateForm(channelCreateSchema, formData);
  if (!validation.success) {
    return jsonError(Object.values(validation.errors)[0]);
  }

  const { name, type, baseUrl, apiKey, models, weight, priority } = validation.data;

  // Parse models string to array
  const modelsArray = models
    ? models.split(",").map((m: string) => m.trim()).filter(Boolean)
    : [];

  const [result] = await db.insert(channels).values({
    name,
    type,
    baseUrl,
    apiKey,
    models: modelsArray,
    weight,
    priority,
    timeout: Number(body.timeout) || 60000,
  });

  return jsonSuccess({ id: result.insertId });
}
