import type { ChannelType, OpenAIChatStreamChunk, AnthropicStreamEvent } from "./types";

export type TargetFormat = "openai_chat" | "openai_responses" | "anthropic";

interface StreamContext {
  id: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

// Transform upstream SSE stream to target format
export function createStreamTransformer(
  sourceType: ChannelType,
  targetFormat: TargetFormat,
  onComplete?: (ctx: StreamContext) => void
): TransformStream<Uint8Array, Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";
  const ctx: StreamContext = { id: "", model: "", inputTokens: 0, outputTokens: 0 };

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          const converted = convertStreamChunk(parsed, sourceType, targetFormat, ctx);
          if (converted) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(converted)}\n\n`));
          }
        } catch {
          // Skip invalid JSON
        }
      }
    },
    flush(controller) {
      onComplete?.(ctx);
      controller.terminate();
    },
  });
}

function convertStreamChunk(
  chunk: unknown,
  sourceType: ChannelType,
  targetFormat: TargetFormat,
  ctx: StreamContext
): unknown | null {
  // Parse source format
  let id: string;
  let model: string;
  let delta: string;
  let finishReason: string | null = null;

  if (sourceType === "openai_chat" || sourceType === "openai_responses") {
    const c = chunk as OpenAIChatStreamChunk;
    id = c.id;
    model = c.model;
    delta = c.choices?.[0]?.delta?.content ?? "";
    finishReason = c.choices?.[0]?.finish_reason ?? null;
  } else {
    // Anthropic
    const c = chunk as AnthropicStreamEvent;
    if (c.type === "message_start" && c.message) {
      ctx.id = c.message.id;
      ctx.model = c.message.model;
      ctx.inputTokens = c.message.usage?.input_tokens ?? 0;
      return null;
    }
    if (c.type === "content_block_delta" && c.delta?.text) {
      delta = c.delta.text;
    } else if (c.type === "message_delta") {
      finishReason = c.delta?.stop_reason ?? null;
      ctx.outputTokens = c.usage?.output_tokens ?? 0;
      delta = "";
    } else {
      return null;
    }
    id = ctx.id;
    model = ctx.model;
  }

  ctx.id = id;
  ctx.model = model;

  // Convert to target format
  if (targetFormat === "openai_chat") {
    return {
      id,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index: 0, delta: { content: delta }, finish_reason: finishReason }],
    };
  }

  if (targetFormat === "openai_responses") {
    if (delta) {
      return {
        type: "response.output_text.delta",
        delta: { text: delta },
      };
    }
    if (finishReason) {
      return { type: "response.completed" };
    }
    return null;
  }

  if (targetFormat === "anthropic") {
    if (delta) {
      return {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: delta },
      };
    }
    if (finishReason) {
      return {
        type: "message_delta",
        delta: { stop_reason: finishReason },
      };
    }
    return null;
  }

  return null;
}

export function createSSEResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
