import type { LLMAdapter, AdapterResponse } from "./base";
import { buildRequestUrl, withRetry } from "./base";
import type { ChannelWithMapping } from "../../balancer";
import type { UnifiedRequest, AnthropicResponse } from "../types";
import { unifiedToAnthropic, anthropicResponseToUnified } from "../converter";

export const anthropicAdapter: LLMAdapter = {
  type: "anthropic",

  async sendRequest(
    channel: ChannelWithMapping,
    request: UnifiedRequest,
    actualModel: string
  ): Promise<AdapterResponse> {
    const url = buildRequestUrl(channel.baseUrl, "anthropic");
    const body = unifiedToAnthropic(request, actualModel);

    const doRequest = async (): Promise<AdapterResponse> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), channel.timeout);

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": channel.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const error = await res.text();
          return { error: `Anthropic API error: ${res.status} - ${error}` };
        }

        if (request.stream) {
          return { stream: res.body! };
        }

        const data = (await res.json()) as AnthropicResponse;
        return { response: anthropicResponseToUnified(data) };
      } catch (e) {
        clearTimeout(timeoutId);
        return { error: e instanceof Error ? e.message : "Unknown error" };
      }
    };

    return withRetry(doRequest, channel.maxRetries ?? 0, !!request.stream);
  },
};
