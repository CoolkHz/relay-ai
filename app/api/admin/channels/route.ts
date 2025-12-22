import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { channels } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { parseRequestBody, jsonError, jsonSuccess } from "@/lib/utils/api";
import { channelCreateSchema, validateForm } from "@/lib/validations";

function normalizeModels(models: string | string[] | undefined): string[] {
  if (!models) return [];
  if (Array.isArray(models)) {
    return models.map((m) => String(m).trim()).filter(Boolean);
  }
  return models
    .split(",")
    .map((m: string) => m.trim())
    .filter(Boolean);
}

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
    models: body.models as string | string[] | undefined,
    status: body.status,
    maxRetries: body.maxRetries,
    timeout: body.timeout,
    weight: body.weight,
    priority: body.priority,
  };

  const validation = validateForm(channelCreateSchema, formData);
  if (!validation.success) {
    return jsonError(Object.values(validation.errors)[0]);
  }

  const { name, type, baseUrl, apiKey, models, weight, priority, status, maxRetries, timeout } = validation.data;
  const modelsArray = normalizeModels(models);

  const [result] = await db.insert(channels).values({
    name,
    type,
    baseUrl,
    apiKey,
    models: modelsArray,
    status,
    weight,
    priority,
    maxRetries,
    timeout,
  });

  return jsonSuccess({ id: result.insertId });
}
