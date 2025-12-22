import { NextRequest } from "next/server";
import { anthropicToUnified, unifiedToAnthropicResponse } from "@/lib/llm/converter";
import { estimateTokens } from "@/lib/stats/tracker";
import type { AnthropicRequest } from "@/lib/llm/types";
import { handleGatewayRequest } from "@/lib/gateway/handle-gateway-request";
import { extractBearerToken } from "@/lib/gateway/auth";

function anthropicError(type: string, message: string, status: number): Response {
  return Response.json({ type: "error", error: { type, message } }, { status });
}

export async function POST(request: NextRequest) {
  return handleGatewayRequest(request, "anthropic", {
    parseBody: async (req) => (await req.json()) as AnthropicRequest,
    extractApiKey: (req) => {
      return req.headers.get("x-api-key") ?? extractBearerToken(req.headers.get("Authorization"));
    },
    toUnified: anthropicToUnified,
    toResponse: unifiedToAnthropicResponse,
    estimateInputTokensFallback: (body) => estimateTokens(JSON.stringify(body.messages)),
    errors: {
      invalidApiKey: () => anthropicError("authentication_error", "Invalid API key", 401),
      quotaExceeded: () => anthropicError("rate_limit_error", "Quota exceeded", 429),
      rateLimitExceeded: () => anthropicError("rate_limit_error", "Rate limit exceeded", 429),
      invalidJson: () => anthropicError("invalid_request_error", "Invalid JSON", 400),
      modelNotFound: (model) => anthropicError("invalid_request_error", `Model '${model}' not found`, 404),
      upstreamError: (message) => anthropicError("api_error", message, 502),
      unknownError: () => anthropicError("api_error", "Unknown error", 500),
    },
  });
}
