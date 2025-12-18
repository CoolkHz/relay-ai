// ==================== Unified Internal Format ====================

export interface UnifiedMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface UnifiedRequest {
  model: string;
  messages: UnifiedMessage[];
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string | string[];
}

export interface UnifiedResponse {
  id: string;
  model: string;
  content: string;
  finishReason: string | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface UnifiedStreamChunk {
  id: string;
  model: string;
  delta: string;
  finishReason: string | null;
}

// ==================== OpenAI Chat Format ====================

export interface OpenAIChatMessage {
  role: "system" | "user" | "assistant";
  content: string | OpenAIChatContentPart[];
}

export interface OpenAIChatContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string; detail?: string };
}

export interface OpenAIChatRequest {
  model: string;
  messages: OpenAIChatMessage[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string | string[];
}

export interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: { role: string; content: string };
    finish_reason: string | null;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIChatStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: { role?: string; content?: string };
    finish_reason: string | null;
  }[];
}

// ==================== OpenAI Responses Format ====================

export interface OpenAIResponsesRequest {
  model: string;
  input: string | OpenAIResponsesInputItem[];
  stream?: boolean;
  max_output_tokens?: number;
  temperature?: number;
  top_p?: number;
}

export interface OpenAIResponsesInputItem {
  type: "message";
  role: "user" | "assistant" | "system";
  content: string | { type: "input_text"; text: string }[];
}

export interface OpenAIResponsesResponse {
  id: string;
  object: string;
  created_at: number;
  model: string;
  output: {
    type: "message";
    id: string;
    role: string;
    content: { type: "output_text"; text: string }[];
  }[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

// ==================== Anthropic Format ====================

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentPart[];
}

export interface AnthropicContentPart {
  type: "text" | "image";
  text?: string;
  source?: { type: "base64"; media_type: string; data: string };
}

export interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  system?: string;
  stream?: boolean;
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
}

export interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  model: string;
  content: { type: "text"; text: string }[];
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface AnthropicStreamEvent {
  type: string;
  index?: number;
  message?: AnthropicResponse;
  content_block?: { type: string; text: string };
  delta?: { type: string; text?: string; stop_reason?: string };
  usage?: { output_tokens: number };
}

// ==================== Channel Types ====================

export type ChannelType = "openai_chat" | "openai_responses" | "anthropic";
