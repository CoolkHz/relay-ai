import { NextRequest } from "next/server";
import { openaiChatToUnified, unifiedToOpenaiChatResponse } from "@/lib/llm/converter";
import { estimateTokens } from "@/lib/stats/tracker";
import { openaiErrorResponse } from "@/lib/utils/openai";
import type { OpenAIChatRequest } from "@/lib/llm/types";
import { handleGatewayRequest } from "@/lib/gateway/handle-gateway-request";
import { extractBearerToken } from "@/lib/gateway/auth";

export async function POST(request: NextRequest) {
  return handleGatewayRequest(request, "openai_chat", {
    parseBody: async (req) => (await req.json()) as OpenAIChatRequest,
    extractApiKey: (req) => {
      return extractBearerToken(req.headers.get("Authorization"));
    },
    toUnified: openaiChatToUnified,
    toResponse: unifiedToOpenaiChatResponse,
    estimateInputTokensFallback: (body) => estimateTokens(JSON.stringify(body.messages)),
    errors: {
      invalidApiKey: () => openaiErrorResponse("Invalid API key", "invalid_request_error", 401),
      quotaExceeded: () => openaiErrorResponse("Quota exceeded", "insufficient_quota", 429),
      rateLimitExceeded: () => openaiErrorResponse("Rate limit exceeded", "rate_limit_error", 429),
      invalidJson: () => openaiErrorResponse("Invalid JSON", "invalid_request_error", 400),
      modelNotFound: (model) => openaiErrorResponse(`Model '${model}' not found`, "invalid_request_error", 404),
      upstreamError: (message) => openaiErrorResponse(message, "api_error", 502),
      unknownError: () => openaiErrorResponse("Unknown error", "api_error", 500),
    },
  });
}
