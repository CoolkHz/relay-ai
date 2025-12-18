import type {
  UnifiedRequest,
  UnifiedResponse,
  UnifiedMessage,
  OpenAIChatRequest,
  OpenAIChatResponse,
  OpenAIResponsesRequest,
  OpenAIResponsesResponse,
  OpenAIResponsesInputItem,
  AnthropicRequest,
  AnthropicResponse,
  AnthropicMessage,
  ChannelType,
} from "./types";

// ==================== To Unified ====================

export function openaiChatToUnified(req: OpenAIChatRequest): UnifiedRequest {
  return {
    model: req.model,
    messages: req.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })) as UnifiedMessage[],
    stream: req.stream,
    maxTokens: req.max_tokens,
    temperature: req.temperature,
    topP: req.top_p,
    stop: req.stop,
  };
}

export function openaiResponsesToUnified(req: OpenAIResponsesRequest): UnifiedRequest {
  let messages: UnifiedMessage[];

  if (typeof req.input === "string") {
    messages = [{ role: "user", content: req.input }];
  } else {
    messages = req.input.map((item) => {
      let content: string;
      if (typeof item.content === "string") {
        content = item.content;
      } else {
        content = item.content.map((c) => c.text).join("");
      }
      return { role: item.role, content };
    });
  }

  return {
    model: req.model,
    messages,
    stream: req.stream,
    maxTokens: req.max_output_tokens,
    temperature: req.temperature,
    topP: req.top_p,
  };
}

export function anthropicToUnified(req: AnthropicRequest): UnifiedRequest {
  const messages: UnifiedMessage[] = [];

  if (req.system) {
    messages.push({ role: "system", content: req.system });
  }

  for (const m of req.messages) {
    let content: string;
    if (typeof m.content === "string") {
      content = m.content;
    } else {
      content = m.content
        .filter((c) => c.type === "text")
        .map((c) => c.text!)
        .join("");
    }
    messages.push({ role: m.role, content });
  }

  return {
    model: req.model,
    messages,
    stream: req.stream,
    maxTokens: req.max_tokens,
    temperature: req.temperature,
    topP: req.top_p,
    stop: req.stop_sequences,
  };
}

// ==================== From Unified ====================

export function unifiedToOpenaiChat(req: UnifiedRequest, modelOverride?: string): OpenAIChatRequest {
  return {
    model: modelOverride ?? req.model,
    messages: req.messages.map((m) => ({
      role: m.role,
      content: m.content as string,
    })),
    stream: req.stream,
    max_tokens: req.maxTokens,
    temperature: req.temperature,
    top_p: req.topP,
    stop: req.stop,
  };
}

export function unifiedToOpenaiResponses(req: UnifiedRequest, modelOverride?: string): OpenAIResponsesRequest {
  const input: OpenAIResponsesInputItem[] = req.messages.map((m) => ({
    type: "message",
    role: m.role === "system" ? "system" : m.role,
    content: typeof m.content === "string" ? m.content : m.content.map((c) => ({ type: "input_text" as const, text: c.text ?? "" })),
  }));

  return {
    model: modelOverride ?? req.model,
    input,
    stream: req.stream,
    max_output_tokens: req.maxTokens,
    temperature: req.temperature,
    top_p: req.topP,
  };
}

export function unifiedToAnthropic(req: UnifiedRequest, modelOverride?: string): AnthropicRequest {
  let system: string | undefined;
  const messages: AnthropicMessage[] = [];

  for (const m of req.messages) {
    if (m.role === "system") {
      system = typeof m.content === "string" ? m.content : m.content.map((c) => c.text).join("");
    } else {
      messages.push({
        role: m.role as "user" | "assistant",
        content: typeof m.content === "string" ? m.content : m.content.map((c) => ({ type: "text" as const, text: c.text ?? "" })),
      });
    }
  }

  return {
    model: modelOverride ?? req.model,
    messages,
    system,
    stream: req.stream,
    max_tokens: req.maxTokens ?? 4096,
    temperature: req.temperature,
    top_p: req.topP,
    stop_sequences: req.stop ? (Array.isArray(req.stop) ? req.stop : [req.stop]) : undefined,
  };
}

// ==================== Response Conversion ====================

export function openaiChatResponseToUnified(res: OpenAIChatResponse): UnifiedResponse {
  const choice = res.choices[0];
  return {
    id: res.id,
    model: res.model,
    content: choice?.message?.content ?? "",
    finishReason: choice?.finish_reason ?? null,
    usage: {
      inputTokens: res.usage?.prompt_tokens ?? 0,
      outputTokens: res.usage?.completion_tokens ?? 0,
      totalTokens: res.usage?.total_tokens ?? 0,
    },
  };
}

export function openaiResponsesResponseToUnified(res: OpenAIResponsesResponse): UnifiedResponse {
  const output = res.output[0];
  const content = output?.content?.map((c) => c.text).join("") ?? "";
  return {
    id: res.id,
    model: res.model,
    content,
    finishReason: "stop",
    usage: {
      inputTokens: res.usage?.input_tokens ?? 0,
      outputTokens: res.usage?.output_tokens ?? 0,
      totalTokens: res.usage?.total_tokens ?? 0,
    },
  };
}

export function anthropicResponseToUnified(res: AnthropicResponse): UnifiedResponse {
  const content = res.content.map((c) => c.text).join("");
  return {
    id: res.id,
    model: res.model,
    content,
    finishReason: res.stop_reason,
    usage: {
      inputTokens: res.usage?.input_tokens ?? 0,
      outputTokens: res.usage?.output_tokens ?? 0,
      totalTokens: (res.usage?.input_tokens ?? 0) + (res.usage?.output_tokens ?? 0),
    },
  };
}

// ==================== Unified to Target Response ====================

export function unifiedToOpenaiChatResponse(res: UnifiedResponse): OpenAIChatResponse {
  return {
    id: res.id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: res.model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: res.content },
        finish_reason: res.finishReason,
      },
    ],
    usage: {
      prompt_tokens: res.usage.inputTokens,
      completion_tokens: res.usage.outputTokens,
      total_tokens: res.usage.totalTokens,
    },
  };
}

export function unifiedToOpenaiResponsesResponse(res: UnifiedResponse): OpenAIResponsesResponse {
  return {
    id: res.id,
    object: "response",
    created_at: Math.floor(Date.now() / 1000),
    model: res.model,
    output: [
      {
        type: "message",
        id: `msg_${res.id}`,
        role: "assistant",
        content: [{ type: "output_text", text: res.content }],
      },
    ],
    usage: {
      input_tokens: res.usage.inputTokens,
      output_tokens: res.usage.outputTokens,
      total_tokens: res.usage.totalTokens,
    },
  };
}

export function unifiedToAnthropicResponse(res: UnifiedResponse): AnthropicResponse {
  return {
    id: res.id,
    type: "message",
    role: "assistant",
    model: res.model,
    content: [{ type: "text", text: res.content }],
    stop_reason: res.finishReason,
    usage: {
      input_tokens: res.usage.inputTokens,
      output_tokens: res.usage.outputTokens,
    },
  };
}

// ==================== Helper ====================

export function convertRequest(unified: UnifiedRequest, targetType: ChannelType, modelOverride?: string) {
  switch (targetType) {
    case "openai_chat":
      return unifiedToOpenaiChat(unified, modelOverride);
    case "openai_responses":
      return unifiedToOpenaiResponses(unified, modelOverride);
    case "anthropic":
      return unifiedToAnthropic(unified, modelOverride);
  }
}
