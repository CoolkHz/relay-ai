# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Relay AI 是一个 LLM API 网关和负载均衡器，支持多种 LLM 提供商（OpenAI、Anthropic）的统一接入和管理。

## 常用命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 构建生产版本
pnpm lint         # ESLint 检查
pnpm typecheck    # TypeScript 类型检查

# 数据库操作 (Drizzle + MySQL)
pnpm db:generate  # 生成迁移文件
pnpm db:migrate   # 执行迁移
pnpm db:push      # 推送 schema 到数据库
pnpm db:studio    # 打开 Drizzle Studio
pnpm db:seed      # 填充种子数据
pnpm db:reset     # 重置数据库
```

## 架构概览

### 核心请求流程

```
客户端请求 → API Key 验证 → 配额检查 → 负载均衡选择渠道 → 格式转换 → 上游请求 → 响应转换 → 返回
```

### 目录结构

- `app/api/v1/` - OpenAI 兼容 API 端点 (chat/completions, responses, models)
- `app/api/anthropic/` - Anthropic 兼容 API 端点
- `app/api/admin/` - 管理后台 API
- `app/(dashboard)/` - 管理后台页面
- `lib/llm/` - LLM 适配器层（统一格式转换）
- `lib/balancer/` - 负载均衡策略（round_robin, random, weighted, failover）
- `lib/db/` - Drizzle ORM schema 和数据库操作
- `lib/auth/` - API Key 和 Session 认证
- `lib/cache/` - KV 缓存层
- `components/ui/` - shadcn/ui 组件

### 关键设计模式

1. **统一消息格式** (`lib/llm/types.ts`): 所有 LLM 请求先转换为 `UnifiedRequest`，响应转换为 `UnifiedResponse`
2. **适配器模式** (`lib/llm/adapters/`): 每种渠道类型有独立适配器处理格式转换
3. **分组-渠道模型**: 请求模型名映射到分组，分组包含多个渠道，通过负载均衡策略选择

### 数据模型

- `users` / `apiKeys` - 用户和 API 密钥
- `channels` - 上游 LLM 渠道配置
- `groups` / `groupChannels` - 分组和渠道关联（含模型映射）
- `models` - 模型价格配置
- `requestLogs` / `dailyStats` - 请求日志和统计

## 技术栈

- Next.js 16 (App Router)
- React 19 + shadcn/ui + Tailwind CSS 4
- Drizzle ORM + MySQL
- SWR 数据获取
