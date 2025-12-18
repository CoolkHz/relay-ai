import type { LLMAdapter } from "./base";
import type { ChannelType } from "../types";
import { openaiChatAdapter } from "./openai-chat";
import { openaiResponsesAdapter } from "./openai-responses";
import { anthropicAdapter } from "./anthropic";

const adapters: Record<ChannelType, LLMAdapter> = {
  openai_chat: openaiChatAdapter,
  openai_responses: openaiResponsesAdapter,
  anthropic: anthropicAdapter,
};

export function getAdapter(type: ChannelType): LLMAdapter {
  return adapters[type];
}

export * from "./base";
