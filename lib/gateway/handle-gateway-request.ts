import type { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/auth/api-key";
import { selectChannel } from "@/lib/balancer";
import { recordChannelError, recordChannelSuccess } from "@/lib/balancer/health";
import { getAdapter } from "@/lib/llm/adapters";
import { createSSEResponse, createStreamTransformer, type TargetFormat } from "@/lib/llm/stream";
import type { UnifiedRequest, UnifiedResponse } from "@/lib/llm/types";
import {
  calculateCost,
  checkQuota,
  checkRateLimit,
  getModelPrice,
  logRequest,
} from "@/lib/stats/tracker";

type StreamContext = {
  inputTokens?: number;
  outputTokens: number;
};

export type GatewayErrorResponder = {
  invalidApiKey: () => Response;
  quotaExceeded: () => Response;
  rateLimitExceeded: () => Response;
  invalidJson: () => Response;
  modelNotFound: (model: string) => Response;
  upstreamError: (message: string) => Response;
  unknownError: () => Response;
};

export type GatewayHandlers<TBody extends { model: string; stream?: boolean }> = {
  parseBody: (request: NextRequest) => Promise<TBody>;
  extractApiKey: (request: NextRequest) => string | null;
  toUnified: (body: TBody) => UnifiedRequest;
  toResponse: (response: UnifiedResponse) => unknown;
  estimateInputTokensFallback: (body: TBody) => number;
  errors: GatewayErrorResponder;
};

export async function handleGatewayRequest<TBody extends { model: string; stream?: boolean }>(
  request: NextRequest,
  targetFormat: TargetFormat,
  handlers: GatewayHandlers<TBody>
): Promise<Response> {
  const startTime = Date.now();

  const apiKey = handlers.extractApiKey(request);
  const auth = await validateApiKey(apiKey);
  if (!auth) return handlers.errors.invalidApiKey();

  if (!checkQuota(auth.userId, auth.quota, auth.usedQuota)) {
    return handlers.errors.quotaExceeded();
  }

  if (!(await checkRateLimit(auth.userId))) {
    return handlers.errors.rateLimitExceeded();
  }

  let body: TBody;
  try {
    body = await handlers.parseBody(request);
  } catch {
    return handlers.errors.invalidJson();
  }

  const { model, stream } = body;

  const selection = await selectChannel(model);
  if (!selection) return handlers.errors.modelNotFound(model);

  const { channel, actualModel, groupId } = selection;
  const unified = handlers.toUnified(body);

  const adapter = getAdapter(channel.type);
  const result = await adapter.sendRequest(channel, unified, actualModel);

  const requestIp = request.headers.get("x-forwarded-for") ?? undefined;

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
      ip: requestIp,
    });

    return handlers.errors.upstreamError(result.error);
  }

  if (stream && result.stream) {
    const transformer = createStreamTransformer(channel.type, targetFormat, async (ctx: StreamContext) => {
      await recordChannelSuccess(channel.id);
      const inputTokens = ctx.inputTokens || handlers.estimateInputTokensFallback(body);
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
        ip: requestIp,
      });
    });

    return createSSEResponse(result.stream.pipeThrough(transformer));
  }

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
      ip: requestIp,
    });

    return Response.json(handlers.toResponse(result.response));
  }

  return handlers.errors.unknownError();
}
