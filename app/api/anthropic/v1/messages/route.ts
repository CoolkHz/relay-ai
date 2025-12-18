import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/auth/api-key";
import { selectChannel } from "@/lib/balancer";
import { recordChannelSuccess, recordChannelError } from "@/lib/balancer/health";
import { getAdapter } from "@/lib/llm/adapters";
import { anthropicToUnified, unifiedToAnthropicResponse } from "@/lib/llm/converter";
import { createStreamTransformer, createSSEResponse } from "@/lib/llm/stream";
import { logRequest, checkQuota, estimateTokens } from "@/lib/stats/tracker";
import type { AnthropicRequest } from "@/lib/llm/types";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // 1. Validate API Key (Anthropic uses x-api-key header)
  const apiKey = request.headers.get("x-api-key");
  const auth = await validateApiKey(apiKey);

  if (!auth) {
    return Response.json(
      { type: "error", error: { type: "authentication_error", message: "Invalid API key" } },
      { status: 401 }
    );
  }

  // 2. Check quota
  if (!checkQuota(auth.userId, auth.quota, auth.usedQuota)) {
    return Response.json(
      { type: "error", error: { type: "rate_limit_error", message: "Quota exceeded" } },
      { status: 429 }
    );
  }

  // 3. Parse request
  let body: AnthropicRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { type: "error", error: { type: "invalid_request_error", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const { model, stream } = body;

  // 4. Select channel via load balancer
  const selection = await selectChannel(model);
  if (!selection) {
    return Response.json(
      { type: "error", error: { type: "invalid_request_error", message: `Model '${model}' not found` } },
      { status: 404 }
    );
  }

  const { channel, actualModel } = selection;

  // 5. Convert to unified format
  const unified = anthropicToUnified(body);

  // 6. Get adapter and send request
  const adapter = getAdapter(channel.type);
  const result = await adapter.sendRequest(channel, unified, actualModel);

  // 7. Handle error
  if (result.error) {
    await recordChannelError(channel.id, result.error);

    await logRequest({
      userId: auth.userId,
      apiKeyId: auth.apiKeyId,
      groupId: 0,
      channelId: channel.id,
      requestModel: model,
      actualModel,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      latency: Date.now() - startTime,
      status: "error",
      errorMessage: result.error,
      ip: request.headers.get("x-forwarded-for") ?? undefined,
    });

    return Response.json(
      { type: "error", error: { type: "api_error", message: result.error } },
      { status: 502 }
    );
  }

  // 8. Handle streaming response
  if (stream && result.stream) {
    const transformer = createStreamTransformer(channel.type, "anthropic", async (ctx) => {
      await recordChannelSuccess(channel.id);
      await logRequest({
        userId: auth.userId,
        apiKeyId: auth.apiKeyId,
        groupId: 0,
        channelId: channel.id,
        requestModel: model,
        actualModel,
        inputTokens: ctx.inputTokens || estimateTokens(JSON.stringify(body.messages)),
        outputTokens: ctx.outputTokens,
        cost: 0,
        latency: Date.now() - startTime,
        status: "success",
        ip: request.headers.get("x-forwarded-for") ?? undefined,
      });
    });

    return createSSEResponse(result.stream.pipeThrough(transformer));
  }

  // 9. Handle non-streaming response
  if (result.response) {
    await recordChannelSuccess(channel.id);

    await logRequest({
      userId: auth.userId,
      apiKeyId: auth.apiKeyId,
      groupId: 0,
      channelId: channel.id,
      requestModel: model,
      actualModel,
      inputTokens: result.response.usage.inputTokens,
      outputTokens: result.response.usage.outputTokens,
      cost: 0,
      latency: Date.now() - startTime,
      status: "success",
      ip: request.headers.get("x-forwarded-for") ?? undefined,
    });

    return Response.json(unifiedToAnthropicResponse(result.response));
  }

  return Response.json(
    { type: "error", error: { type: "api_error", message: "Unknown error" } },
    { status: 500 }
  );
}
