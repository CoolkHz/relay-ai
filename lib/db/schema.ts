import { mysqlTable as table, mysqlEnum } from "drizzle-orm/mysql-core";
import * as t from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// ==================== 用户系统 ====================

export const users = table("users", {
  id: t.int().primaryKey().autoincrement(),
  username: t.varchar({ length: 64 }).notNull(),
  email: t.varchar({ length: 255 }).notNull(),
  passwordHash: t.varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "user"]).default("user").notNull(),
  status: mysqlEnum("status", ["active", "disabled"]).default("active").notNull(),
  quota: t.bigint({ mode: "number" }).default(0),
  usedQuota: t.bigint("used_quota", { mode: "number" }).default(0),
  createdAt: t.timestamp("created_at").defaultNow().notNull(),
  updatedAt: t.timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  t.uniqueIndex("email_idx").on(table.email),
  t.uniqueIndex("username_idx").on(table.username),
]);

export const apiKeys = table("api_keys", {
  id: t.int().primaryKey().autoincrement(),
  userId: t.int("user_id").notNull(),
  name: t.varchar({ length: 64 }).notNull(),
  keyHash: t.varchar("key_hash", { length: 255 }).notNull(),
  keyPrefix: t.varchar("key_prefix", { length: 12 }).notNull(),
  status: mysqlEnum("status", ["active", "disabled"]).default("active").notNull(),
  expiresAt: t.timestamp("expires_at"),
  createdAt: t.timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  t.index("user_id_idx").on(table.userId),
  t.uniqueIndex("key_hash_idx").on(table.keyHash),
]);

// ==================== 渠道管理 ====================

export const channelTypeEnum = mysqlEnum("channel_type", ["openai_chat", "openai_responses", "anthropic"]);

export const channels = table("channels", {
  id: t.int().primaryKey().autoincrement(),
  name: t.varchar({ length: 64 }).notNull(),
  type: channelTypeEnum.notNull(),
  baseUrl: t.varchar("base_url", { length: 512 }).notNull(),
  apiKey: t.text("api_key").notNull(),
  models: t.json().$type<string[]>(),
  status: mysqlEnum("status", ["active", "disabled"]).default("active").notNull(),
  weight: t.int().default(1).notNull(),
  priority: t.int().default(0).notNull(),
  maxRetries: t.int("max_retries").default(3).notNull(),
  timeout: t.int().default(60000).notNull(),
  createdAt: t.timestamp("created_at").defaultNow().notNull(),
  updatedAt: t.timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// ==================== 分组管理 ====================

export const balanceStrategyEnum = mysqlEnum("balance_strategy", ["round_robin", "random", "weighted", "failover"]);

export const groups = table("groups", {
  id: t.int().primaryKey().autoincrement(),
  name: t.varchar({ length: 64 }).notNull(),
  description: t.varchar({ length: 255 }),
  balanceStrategy: balanceStrategyEnum.default("round_robin").notNull(),
  status: mysqlEnum("status", ["active", "disabled"]).default("active").notNull(),
  createdAt: t.timestamp("created_at").defaultNow().notNull(),
  updatedAt: t.timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  t.uniqueIndex("name_idx").on(table.name),
]);

export const groupChannels = table("group_channels", {
  id: t.int().primaryKey().autoincrement(),
  groupId: t.int("group_id").notNull(),
  channelId: t.int("channel_id").notNull(),
  modelMapping: t.varchar("model_mapping", { length: 128 }),
  weight: t.int().default(1).notNull(),
  priority: t.int().default(0).notNull(),
}, (table) => [
  t.index("group_id_idx").on(table.groupId),
  t.uniqueIndex("group_channel_idx").on(table.groupId, table.channelId),
]);

// ==================== 模型价格 ====================

export const models = table("models", {
  id: t.int().primaryKey().autoincrement(),
  name: t.varchar({ length: 128 }).notNull(),
  inputPrice: t.decimal("input_price", { precision: 20, scale: 10 }).default("0"),
  outputPrice: t.decimal("output_price", { precision: 20, scale: 10 }).default("0"),
  source: mysqlEnum("source", ["manual", "sync"]).default("manual").notNull(),
  createdAt: t.timestamp("created_at").defaultNow().notNull(),
  updatedAt: t.timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  t.uniqueIndex("name_idx").on(table.name),
]);

// ==================== 请求日志 ====================

export const requestLogs = table("request_logs", {
  id: t.bigint({ mode: "number" }).primaryKey().autoincrement(),
  userId: t.int("user_id"),
  apiKeyId: t.int("api_key_id"),
  groupId: t.int("group_id"),
  channelId: t.int("channel_id"),
  requestModel: t.varchar("request_model", { length: 128 }),
  actualModel: t.varchar("actual_model", { length: 128 }),
  inputTokens: t.int("input_tokens").default(0),
  outputTokens: t.int("output_tokens").default(0),
  totalTokens: t.int("total_tokens").default(0),
  cost: t.decimal({ precision: 20, scale: 10 }).default("0"),
  latency: t.int().default(0),
  status: mysqlEnum("status", ["success", "error"]).notNull(),
  errorMessage: t.text("error_message"),
  ip: t.varchar({ length: 45 }),
  createdAt: t.timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  t.index("user_id_idx").on(table.userId),
  t.index("created_at_idx").on(table.createdAt),
  t.index("channel_id_idx").on(table.channelId),
]);

// ==================== 统计汇总 ====================

export const dailyStats = table("daily_stats", {
  id: t.int().primaryKey().autoincrement(),
  date: t.date().notNull(),
  userId: t.int("user_id"),
  channelId: t.int("channel_id"),
  requestCount: t.int("request_count").default(0),
  successCount: t.int("success_count").default(0),
  errorCount: t.int("error_count").default(0),
  inputTokens: t.bigint("input_tokens", { mode: "number" }).default(0),
  outputTokens: t.bigint("output_tokens", { mode: "number" }).default(0),
  totalCost: t.decimal("total_cost", { precision: 20, scale: 10 }).default("0"),
  avgLatency: t.int("avg_latency").default(0),
}, (table) => [
  t.uniqueIndex("date_user_channel_idx").on(table.date, table.userId, table.channelId),
]);

// ==================== 系统设置 ====================

export const settings = table("settings", {
  key: t.varchar({ length: 64 }).primaryKey(),
  value: t.text().notNull(),
  updatedAt: t.timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// ==================== Relations ====================

export const usersRelations = relations(users, ({ many }) => ({
  apiKeys: many(apiKeys),
  requestLogs: many(requestLogs),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, { fields: [apiKeys.userId], references: [users.id] }),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  groupChannels: many(groupChannels),
}));

export const channelsRelations = relations(channels, ({ many }) => ({
  groupChannels: many(groupChannels),
}));

export const groupChannelsRelations = relations(groupChannels, ({ one }) => ({
  group: one(groups, { fields: [groupChannels.groupId], references: [groups.id] }),
  channel: one(channels, { fields: [groupChannels.channelId], references: [channels.id] }),
}));

// ==================== Types ====================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type Channel = typeof channels.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupChannel = typeof groupChannels.$inferSelect;
export type Model = typeof models.$inferSelect;
export type RequestLog = typeof requestLogs.$inferSelect;
export type DailyStat = typeof dailyStats.$inferSelect;
