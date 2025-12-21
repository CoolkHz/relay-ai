import type { ChannelType, OpenAIChatStreamChunk, OpenAIResponsesStreamEvent, AnthropicStreamEvent } from "./types";
import { estimateTokens } from "../utils/tokens";

export type TargetFormat = "openai_chat" | "openai_responses" | "anthropic";

interface StreamContext {
  id: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  text: string;
}

function shouldLogStream(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.RELAY_DEBUG_STREAM === "1";
}

function truncateForLog(text: string, maxLen = 400): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…`;
}

function logStreamDelta(targetFormat: TargetFormat, ctx: StreamContext, delta: string) {
  if (!shouldLogStream() || !delta) return;
  const prefix = `[relay-ai][stream][${targetFormat}]`;
  const meta = `${ctx.id ? ` id=${ctx.id}` : ""}${ctx.model ? ` model=${ctx.model}` : ""}`;
  console.log(`${prefix}${meta} delta=${JSON.stringify(truncateForLog(delta))}`);
}

function logStreamComplete(targetFormat: TargetFormat, ctx: StreamContext) {
  if (!shouldLogStream()) return;
  const prefix = `[relay-ai][stream][${targetFormat}]`;
  const meta = `${ctx.id ? ` id=${ctx.id}` : ""}${ctx.model ? ` model=${ctx.model}` : ""}`;
  console.log(`${prefix}${meta} completed inputTokens=${ctx.inputTokens} outputTokens=${ctx.outputTokens}`);
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
  const ctx: StreamContext = { id: "", model: "", inputTokens: 0, outputTokens: 0, text: "" };
  const anthropicPassthrough = sourceType === "anthropic" && targetFormat === "anthropic";
  let completionSent = false;
  let responsesInitialized = false;
  let responsesTextDoneSent = false;
  let responsesCreatedAt: number | null = null;
  let anthropicInitialized = false;
  let anthropicContentStoppedSent = false;
  let anthropicStoppedSent = false;
  let chatRoleSent = false;

  const enqueueSse = (payload: unknown, eventName?: string) => {
    const eventLine = eventName ? `event: ${eventName}\n` : "";
    const dataLine = `data: ${JSON.stringify(payload)}\n\n`;
    return encoder.encode(`${eventLine}${dataLine}`);
  };

  const getResponsesIds = () => {
    const upstreamId = ctx.id;
    if (upstreamId.startsWith("resp_")) {
      return { responseId: upstreamId, messageId: `msg_${upstreamId.slice(5)}` };
    }
    if (upstreamId.startsWith("msg_")) {
      return { responseId: `resp_${upstreamId.slice(4)}`, messageId: upstreamId };
    }
    return { responseId: `resp_${upstreamId}`, messageId: `msg_${upstreamId}` };
  };

  const ensureResponsesInitialized = (controller: TransformStreamDefaultController<Uint8Array>) => {
    if (targetFormat !== "openai_responses" || responsesInitialized) return;
    if (!ctx.id || !ctx.model) return;

    const createdAt = responsesCreatedAt ?? Math.floor(Date.now() / 1000);
    responsesCreatedAt = createdAt;
    const { responseId, messageId } = getResponsesIds();

    const created = {
      type: "response.created",
      response: {
        id: responseId,
        object: "response",
        created_at: createdAt,
        model: ctx.model,
        status: "in_progress",
        output: [],
      },
    };
    controller.enqueue(enqueueSse(created, created.type));

    const outputItemAdded = {
      type: "response.output_item.added",
      output_index: 0,
      item: { id: messageId, type: "message", role: "assistant", content: [] as unknown[] },
    };
    controller.enqueue(enqueueSse(outputItemAdded, outputItemAdded.type));

    const contentPartAdded = {
      type: "response.content_part.added",
      output_index: 0,
      content_index: 0,
      item_id: messageId,
      part: { type: "output_text", text: "" },
    };
    controller.enqueue(enqueueSse(contentPartAdded, contentPartAdded.type));

    responsesInitialized = true;
  };

  const getAnthropicMessageId = () => {
    const upstreamId = ctx.id;
    if (!upstreamId) return "";
    return upstreamId.startsWith("msg_") ? upstreamId : `msg_${upstreamId}`;
  };

  const ensureAnthropicInitialized = (controller: TransformStreamDefaultController<Uint8Array>) => {
    if (targetFormat !== "anthropic" || anthropicInitialized) return;
    if (!ctx.id || !ctx.model) return;

    const messageId = getAnthropicMessageId();
    const messageStart = {
      type: "message_start",
      message: {
        id: messageId,
        type: "message",
        role: "assistant",
        model: ctx.model,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: ctx.inputTokens, output_tokens: 0 },
      },
    };
    controller.enqueue(enqueueSse(messageStart, messageStart.type));

    const contentStart = {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    };
    controller.enqueue(enqueueSse(contentStart, contentStart.type));

    anthropicInitialized = true;
  };

  const ensureAnthropicContentStopped = (controller: TransformStreamDefaultController<Uint8Array>) => {
    if (targetFormat !== "anthropic" || anthropicContentStoppedSent) return;
    ensureAnthropicInitialized(controller);
    if (!anthropicInitialized) return;
    const payload = { type: "content_block_stop", index: 0 };
    controller.enqueue(enqueueSse(payload, payload.type));
    anthropicContentStoppedSent = true;
  };

  const ensureAnthropicStopped = (controller: TransformStreamDefaultController<Uint8Array>) => {
    if (targetFormat !== "anthropic" || anthropicStoppedSent) return;
    ensureAnthropicInitialized(controller);
    if (!anthropicInitialized) return;
    ensureAnthropicContentStopped(controller);

    const payload = {
      type: "message_delta",
      delta: { stop_reason: "stop", stop_sequence: null },
      usage: { output_tokens: ctx.outputTokens },
    };
    controller.enqueue(enqueueSse(payload, payload.type));
    controller.enqueue(enqueueSse({ type: "message_stop" }, "message_stop"));
    anthropicStoppedSent = true;
    completionSent = true;
    logStreamComplete(targetFormat, ctx);
  };

  const ensureResponsesTextDone = (controller: TransformStreamDefaultController<Uint8Array>) => {
    if (targetFormat !== "openai_responses" || responsesTextDoneSent) return;
    ensureResponsesInitialized(controller);
    if (!responsesInitialized) return;

    const { messageId } = getResponsesIds();
    const payload = {
      type: "response.output_text.done",
      output_index: 0,
      content_index: 0,
      item_id: messageId,
      text: ctx.text,
    };
    controller.enqueue(enqueueSse(payload, payload.type));

    const contentPartDone = {
      type: "response.content_part.done",
      output_index: 0,
      content_index: 0,
      item_id: messageId,
      part: { type: "output_text", text: ctx.text },
    };
    controller.enqueue(enqueueSse(contentPartDone, contentPartDone.type));

    const outputItemDone = {
      type: "response.output_item.done",
      output_index: 0,
      item_id: messageId,
    };
    controller.enqueue(enqueueSse(outputItemDone, outputItemDone.type));

    responsesTextDoneSent = true;
  };

  const ensureResponsesCompleted = (controller: TransformStreamDefaultController<Uint8Array>) => {
    if (targetFormat !== "openai_responses" || completionSent) return;
    ensureResponsesInitialized(controller);
    if (!responsesInitialized) return;
    ensureResponsesTextDone(controller);

    const createdAt = responsesCreatedAt ?? Math.floor(Date.now() / 1000);
    responsesCreatedAt = createdAt;
    const { responseId, messageId } = getResponsesIds();
    const payload = {
      type: "response.completed",
      response: {
        id: responseId,
        object: "response",
        created_at: createdAt,
        model: ctx.model,
        status: "completed",
        output: [
          {
            type: "message",
            id: messageId,
            role: "assistant",
            content: [{ type: "output_text", text: ctx.text }],
          },
        ],
        usage: {
          input_tokens: ctx.inputTokens,
          output_tokens: ctx.outputTokens,
          total_tokens: ctx.inputTokens + ctx.outputTokens,
        },
      },
    };
    controller.enqueue(enqueueSse(payload, payload.type));
    completionSent = true;
    logStreamComplete(targetFormat, ctx);
  };

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          if (targetFormat === "openai_chat") {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } else if (targetFormat === "openai_responses" && !completionSent) {
            ensureResponsesCompleted(controller);
          } else if (targetFormat === "anthropic" && !completionSent && !anthropicPassthrough) {
            ensureAnthropicStopped(controller);
          }
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          const converted = convertStreamChunk(parsed, sourceType, targetFormat, ctx);
          if (converted) {
            const type = (converted as { type?: string }).type;
            if (targetFormat === "openai_responses" && type === "response.completed") {
              ensureResponsesCompleted(controller);
              continue;
            }
            if (targetFormat === "anthropic" && type === "message_delta" && !anthropicPassthrough) {
              ensureAnthropicStopped(controller);
              continue;
            }
            if (targetFormat === "anthropic" && type === "message_stop") {
              completionSent = true;
              logStreamComplete(targetFormat, ctx);
            }

            if (targetFormat === "openai_chat") {
              const convertedAsChunk = converted as {
                id: string;
                object: string;
                created: number;
                model: string;
                choices: Array<{ index: number; delta: { role?: string; content?: string }; finish_reason: string | null }>;
              };
              const firstChoice = convertedAsChunk.choices?.[0];
              const deltaObj = firstChoice?.delta;
              if (deltaObj && !chatRoleSent && !deltaObj.role) {
                const roleOnly = {
                  ...convertedAsChunk,
                  choices: [
                    {
                      ...firstChoice,
                      delta: { role: "assistant" as const },
                      finish_reason: null,
                    },
                  ],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(roleOnly)}\n\n`));
                chatRoleSent = true;
              }
              const content = (converted as { choices?: Array<{ delta?: { content?: string } }> }).choices?.[0]?.delta?.content;
              if (content) logStreamDelta(targetFormat, ctx, content);
            } else if (targetFormat === "openai_responses") {
              if (type === "response.output_text.delta") {
                const delta = (converted as { delta?: string }).delta;
                if (delta) logStreamDelta(targetFormat, ctx, delta);
              }
            } else if (targetFormat === "anthropic") {
              if (!anthropicPassthrough) {
                ensureAnthropicInitialized(controller);
              }
              if (type === "content_block_delta") {
                const delta = (converted as { delta?: { text?: string } }).delta?.text;
                if (delta) {
                  if (!anthropicPassthrough) {
                    ctx.text += delta;
                  }
                  logStreamDelta(targetFormat, ctx, delta);
                }
              }
            }
            if (targetFormat === "openai_chat") {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(converted)}\n\n`));
            } else {
              ensureResponsesInitialized(controller);
              if (targetFormat === "openai_responses") {
                const isTextDelta = type === "response.output_text.delta";
                if (isTextDelta) {
                  const delta = (converted as { delta?: string }).delta ?? "";
                  if (delta) ctx.text += delta;
                }
              }
              if (targetFormat === "openai_responses") {
                const { messageId } = getResponsesIds();
                if (type === "response.output_text.delta") {
                  (converted as { item_id?: string }).item_id = messageId;
                }
                if (type === "response.output_text.done") {
                  (converted as { item_id?: string }).item_id = messageId;
                }
              }
              controller.enqueue(enqueueSse(converted, type));
            }
          }
        } catch {
          // Skip invalid JSON
        }
      }
    },
    flush(controller) {
      onComplete?.(ctx);
      if (targetFormat === "openai_responses" && !completionSent) {
        ensureResponsesCompleted(controller);
      }
      if (targetFormat === "anthropic" && !completionSent && !anthropicPassthrough) {
        ensureAnthropicStopped(controller);
      }
      if (!completionSent) {
        logStreamComplete(targetFormat, ctx);
      }
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
  if (sourceType === "anthropic" && targetFormat === "anthropic") {
    const c = chunk as AnthropicStreamEvent;
    if (c.type === "message_start" && c.message) {
      ctx.id = c.message.id;
      ctx.model = c.message.model;
      ctx.inputTokens = c.message.usage?.input_tokens ?? 0;
      return c;
    }
    if (c.type === "content_block_delta" && c.delta?.text) {
      ctx.text += c.delta.text;
      return c;
    }
    if (c.type === "message_delta") {
      ctx.outputTokens = c.usage?.output_tokens ?? ctx.outputTokens;
      return c;
    }
    return c;
  }

  // Parse source format
  let id: string = ctx.id;
  let model: string = ctx.model;
  let delta: string = "";
  let finishReason: string | null = null;

  if (sourceType === "openai_chat") {
    const c = chunk as OpenAIChatStreamChunk;
    id = c.id ?? id;
    model = c.model ?? model;
    delta = c.choices?.[0]?.delta?.content ?? "";
    finishReason = c.choices?.[0]?.finish_reason ?? null;
    if (c.usage) {
      ctx.inputTokens = c.usage.prompt_tokens;
      ctx.outputTokens = c.usage.completion_tokens;
    } else if (delta) {
      ctx.outputTokens += estimateTokens(delta);
    }
  } else if (sourceType === "openai_responses") {
    const c = chunk as OpenAIResponsesStreamEvent;
    if (c.type === "response.created" && c.response) {
      ctx.id = c.response.id;
      ctx.model = c.response.model;
      return null;
    }
    if (c.type === "response.output_text.delta") {
      const deltaValue = c.delta;
      delta = typeof deltaValue === "string" ? deltaValue : (deltaValue?.text ?? "");
      if (delta) {
        ctx.outputTokens += estimateTokens(delta);
      }
    } else if (c.type === "response.completed" && c.response?.usage) {
      ctx.inputTokens = c.response.usage.input_tokens;
      ctx.outputTokens = c.response.usage.output_tokens;
      finishReason = "stop";
    } else {
      return null;
    }
    id = ctx.id;
    model = ctx.model;
  } else if (sourceType === "anthropic") {
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
    } else {
      return null;
    }
    id = ctx.id;
    model = ctx.model;
  } else {
    return null;
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
        output_index: 0,
        content_index: 0,
        delta,
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
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
