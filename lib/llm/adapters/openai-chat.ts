import type { LLMAdapter, AdapterResponse } from "./base";
import { getEndpointPath, withRetry } from "./base";
import type { ChannelWithMapping } from "../../balancer";
import type { UnifiedRequest, OpenAIChatResponse } from "../types";
import { unifiedToOpenaiChat, openaiChatResponseToUnified } from "../converter";

export const openaiChatAdapter: LLMAdapter = {
  type: "openai_chat",

  async sendRequest(
    channel: ChannelWithMapping,
    request: UnifiedRequest,
    actualModel: string
  ): Promise<AdapterResponse> {
    const url = `${channel.baseUrl}${getEndpointPath("openai_chat")}`;
    const body = unifiedToOpenaiChat(request, actualModel);

    const doRequest = async (): Promise<AdapterResponse> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), channel.timeout);

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${channel.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const error = await res.text();
          return { error: `OpenAI API error: ${res.status} - ${error}` };
        }

        if (request.stream) {
          return { stream: res.body! };
        }

        const data = (await res.json()) as OpenAIChatResponse;
        return { response: openaiChatResponseToUnified(data) };
      } catch (e) {
        clearTimeout(timeoutId);
        return { error: e instanceof Error ? e.message : "Unknown error" };
      }
    };

    return withRetry(doRequest, channel.maxRetries ?? 0, !!request.stream);
  },
};
