import type { ChannelWithMapping } from "../../balancer";
import type { UnifiedRequest, UnifiedResponse, ChannelType } from "../types";

export interface AdapterResponse {
  response?: UnifiedResponse;
  stream?: ReadableStream<Uint8Array>;
  error?: string;
}

export interface LLMAdapter {
  type: ChannelType;
  sendRequest(
    channel: ChannelWithMapping,
    request: UnifiedRequest,
    actualModel: string
  ): Promise<AdapterResponse>;
}

export function getEndpointPath(type: ChannelType): string {
  switch (type) {
    case "openai_chat":
      return "/chat/completions";
    case "openai_responses":
      return "/responses";
    case "anthropic":
      return "/messages";
  }
}

/**
 * Check if an error is retryable (network errors, 5xx, 429)
 */
function isRetryableError(error: string): boolean {
  // Network errors
  if (error.includes("fetch failed") || error.includes("ECONNREFUSED") || error.includes("ETIMEDOUT")) {
    return true;
  }
  // Rate limit or server errors (5xx)
  const statusMatch = error.match(/error: (\d+)/);
  if (statusMatch) {
    const status = parseInt(statusMatch[1]);
    return status === 429 || (status >= 500 && status < 600);
  }
  return false;
}

/**
 * Retry wrapper with exponential backoff
 * Only retries on network errors and 5xx/429 responses
 * Does not retry streaming requests
 */
export async function withRetry<T extends AdapterResponse>(
  fn: () => Promise<T>,
  maxRetries: number,
  isStream: boolean
): Promise<T> {
  // Don't retry streaming requests
  if (isStream || maxRetries <= 0) {
    return fn();
  }

  let lastError: T | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await fn();

    // Success or non-retryable error
    if (!result.error || !isRetryableError(result.error)) {
      return result;
    }

    lastError = result;

    // Don't wait after the last attempt
    if (attempt < maxRetries) {
      // Exponential backoff: 1s, 2s, 4s...
      const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return lastError!;
}
