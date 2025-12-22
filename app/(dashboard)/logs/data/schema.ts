import { z } from "zod";

export const logSchema = z.object({
  id: z.number(),
  userId: z.number().nullable().optional(),
  channelId: z.number().nullable().optional(),
  requestModel: z.string().nullable().optional(),
  actualModel: z.string().nullable().optional(),
  inputTokens: z.number().nullable().optional(),
  outputTokens: z.number().nullable().optional(),
  totalTokens: z.number().nullable().optional(),
  cost: z.string().nullable().optional(),
  latency: z.number().nullable().optional(),
  status: z.union([z.literal("success"), z.literal("error")]),
  errorMessage: z.string().nullable().optional(),
  ip: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type Log = z.infer<typeof logSchema>;

