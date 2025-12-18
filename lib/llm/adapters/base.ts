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
