// Usage: Zod validation schemas for form validation.
import { z } from "zod";

// Channel form validation
export const channelSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(100, "名称不能超过 100 个字符"),
  type: z.enum(["openai_chat", "openai_responses", "anthropic"], {
    error: "请选择渠道类型",
  }),
  baseUrl: z
    .string()
    .min(1, "基础 URL 不能为空")
    .url("请输入有效的 URL 地址"),
  apiKey: z.string().optional(),
  models: z.string().optional(),
  weight: z.number().min(1, "权重至少为 1").max(100, "权重不能超过 100"),
  priority: z.number().min(0, "优先级不能为负数").max(100, "优先级不能超过 100"),
});

export const channelCreateSchema = channelSchema.extend({
  apiKey: z.string().min(1, "API 密钥不能为空"),
});

export type ChannelFormData = z.infer<typeof channelSchema>;

// Group form validation
export const groupSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(100, "名称不能超过 100 个字符"),
  description: z.string().max(500, "描述不能超过 500 个字符").optional(),
  balanceStrategy: z.enum(["round_robin", "random", "weighted", "failover"], {
    error: "请选择负载均衡策略",
  }),
  channels: z
    .array(
      z.object({
        channelId: z.number().min(1, "请选择渠道"),
        modelMapping: z.string().optional(),
        weight: z.number().min(1, "权重至少为 1"),
        priority: z.number().min(0, "优先级不能为负数"),
      })
    )
    .optional(),
});

export type GroupFormData = z.infer<typeof groupSchema>;

// User form validation
export const userSchema = z.object({
  username: z
    .string()
    .min(2, "用户名至少 2 个字符")
    .max(50, "用户名不能超过 50 个字符")
    .regex(/^[a-zA-Z0-9_-]+$/, "用户名只能包含字母、数字、下划线和连字符"),
  email: z.string().min(1, "邮箱不能为空").email("请输入有效的邮箱地址"),
  password: z.string().optional(),
  role: z.enum(["user", "admin"], {
    error: "请选择角色",
  }),
  quota: z.string().regex(/^\d+$/, "配额必须是数字"),
});

export const userCreateSchema = userSchema.extend({
  password: z.string().min(6, "密码至少 6 个字符").max(100, "密码不能超过 100 个字符"),
});

export type UserFormData = z.infer<typeof userSchema>;

// Model form validation
export const modelSchema = z.object({
  name: z
    .string()
    .min(1, "模型名称不能为空")
    .max(100, "模型名称不能超过 100 个字符"),
  inputPrice: z
    .string()
    .regex(/^\d*\.?\d*$/, "请输入有效的价格")
    .refine((val: string) => parseFloat(val) >= 0, "价格不能为负数"),
  outputPrice: z
    .string()
    .regex(/^\d*\.?\d*$/, "请输入有效的价格")
    .refine((val: string) => parseFloat(val) >= 0, "价格不能为负数"),
});

export type ModelFormData = z.infer<typeof modelSchema>;

// Helper function to validate form and return errors
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }

  return { success: false, errors };
}
