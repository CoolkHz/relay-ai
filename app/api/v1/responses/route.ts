import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/auth/api-key";
import { selectChannel } from "@/lib/balancer";
import { recordChannelSuccess, recordChannelError } from "@/lib/balancer/health";
import { getAdapter } from "@/lib/llm/adapters";
import { openaiResponsesToUnified, unifiedToOpenaiResponsesResponse } from "@/lib/llm/converter";
import { createStreamTransformer, createSSEResponse } from "@/lib/llm/stream";
import { logRequest, checkQuota, estimateTokens, getModelPrice, calculateCost, checkRateLimit } from "@/lib/stats/tracker";
import { openaiErrorResponse } from "@/lib/utils/openai";
import type { OpenAIResponsesRequest } from "@/lib/llm/types";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // 1. Validate API Key
  const authHeader = request.headers.get("Authorization");
  const apiKey = authHeader?.replace("Bearer ", "");
  const auth = await validateApiKey(apiKey ?? null);

  if (!auth) {
    return openaiErrorResponse("Invalid API key", "invalid_request_error", 401);
  }

  // 2. Check quota
  if (!checkQuota(auth.userId, auth.quota, auth.usedQuota)) {
    return openaiErrorResponse("Quota exceeded", "insufficient_quota", 429);
  }

  // 3. Check rate limit
  if (!(await checkRateLimit(auth.userId))) {
    return openaiErrorResponse("Rate limit exceeded", "rate_limit_error", 429);
  }

  // 4. Parse request
  let body: OpenAIResponsesRequest;
  try {
    body = await request.json();
  } catch {
    return openaiErrorResponse("Invalid JSON", "invalid_request_error", 400);
  }

  const { model, stream } = body;

  // 4. Select channel via load balancer
  const selection = await selectChannel(model);
  if (!selection) {
    return openaiErrorResponse(`Model '${model}' not found`, "invalid_request_error", 404);
  }

  const { channel, actualModel, groupId } = selection;

  // 5. Convert to unified format
  const unified = openaiResponsesToUnified(body);

  // 6. Get adapter and send request
  const adapter = getAdapter(channel.type);
  const result = await adapter.sendRequest(channel, unified, actualModel);

  // 7. Handle error
  if (result.error) {
    await recordChannelError(channel.id, result.error);

    await logRequest({
      userId: auth.userId,
      apiKeyId: auth.apiKeyId,
      apiKeyHash: auth.keyHash,
      groupId,
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
      { error: { message: result.error, type: "api_error", param: null, code: null } },
      { status: 502 }
    );
  }

  // 8. Handle streaming response
  if (stream && result.stream) {
    const transformer = createStreamTransformer(channel.type, "openai_responses", async (ctx) => {
      await recordChannelSuccess(channel.id);
      const inputTokens = ctx.inputTokens || estimateTokens(JSON.stringify(body.input));
      const outputTokens = ctx.outputTokens;
      const price = await getModelPrice(actualModel);
      const cost = calculateCost(inputTokens, outputTokens, price.input, price.output);
      await logRequest({
        userId: auth.userId,
        apiKeyId: auth.apiKeyId,
        apiKeyHash: auth.keyHash,
        groupId,
        channelId: channel.id,
        requestModel: model,
        actualModel,
        inputTokens,
        outputTokens,
        cost,
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
    const { inputTokens, outputTokens } = result.response.usage;
    const price = await getModelPrice(actualModel);
    const cost = calculateCost(inputTokens, outputTokens, price.input, price.output);

    await logRequest({
      userId: auth.userId,
      apiKeyId: auth.apiKeyId,
      apiKeyHash: auth.keyHash,
      groupId,
      channelId: channel.id,
      requestModel: model,
      actualModel,
      inputTokens,
      outputTokens,
      cost,
      latency: Date.now() - startTime,
      status: "success",
      ip: request.headers.get("x-forwarded-for") ?? undefined,
    });

    return Response.json(unifiedToOpenaiResponsesResponse(result.response));
  }

  return Response.json(
    { error: { message: "Unknown error", type: "api_error", param: null, code: null } },
    { status: 500 }
  );
}
