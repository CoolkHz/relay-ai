import type { LLMAdapter, AdapterResponse } from "./base";
import { getEndpointPath } from "./base";
import type { ChannelWithMapping } from "../../balancer";
import type { UnifiedRequest, OpenAIResponsesResponse } from "../types";
import { unifiedToOpenaiResponses, openaiResponsesResponseToUnified } from "../converter";

export const openaiResponsesAdapter: LLMAdapter = {
  type: "openai_responses",

  async sendRequest(
    channel: ChannelWithMapping,
    request: UnifiedRequest,
    actualModel: string
  ): Promise<AdapterResponse> {
    const url = `${channel.baseUrl}${getEndpointPath("openai_responses")}`;
    const body = unifiedToOpenaiResponses(request, actualModel);

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
        return { error: `OpenAI Responses API error: ${res.status} - ${error}` };
      }

      if (request.stream) {
        return { stream: res.body! };
      }

      const data = (await res.json()) as OpenAIResponsesResponse;
      return { response: openaiResponsesResponseToUnified(data) };
    } catch (e) {
      clearTimeout(timeoutId);
      return { error: e instanceof Error ? e.message : "Unknown error" };
    }
  },
};
