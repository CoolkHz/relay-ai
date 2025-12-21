## 上下文

- 目标：全面审查并优化 Dashboard 前端 UI/UX，统一为 shadcn/ui 范式，移动端可用且关键操作不依赖横向滚动；数据展示升级为专业 DataTable + 多维图表。
- 范围：`app/(dashboard)/*` 全页面（按列表顺序：dashboard → channels → groups → users → models → logs），以及 `components/dashboard/*`、`components/ui/*`。
- 约束：允许新增前端依赖；UI 风格必须统一；移动端验收：`md` 以下卡片化、关键操作可见、无强依赖横向滚动。
- 选择方案：方案 2（引入 `@tanstack/react-table`，落地专业 DataTable 能力）。

## 分阶段执行计划（概要）

### 阶段 A（P0：全局一致性与移动端可用性）
- 修复 a11y 文案与明显错误：`aria-label`/`sr-only` 乱码、分页 label 本地化。
- 修复无效样式与移动端滚动：Sidebar `text-small`、`py-[10vh]`、视口高度 `h-screen`/`min-h-screen` → `h-dvh`/`min-h-dvh`。
- 统一加载/空态：补齐 Skeleton/EmptyState 组件（按需）。

### 阶段 B（P1：专业 DataTable 基建）
- 新增依赖：`@tanstack/react-table`（以及所需 Radix 组件）。
- 升级 `components/dashboard/responsive-table.tsx`：桌面端使用 TanStack 表格渲染，支持排序/列显隐（可选）；移动端继续卡片化（现有 `renderMobileCard` 保持兼容）。

### 阶段 C（P1：逐页应用到所有页面）
- Dashboard：热门模型/每日明细从原生 `<Table>` 迁移到 `ResponsiveTable`。
- Channels/Groups/Models/Logs：保持现有 `ResponsiveTable` 使用方式，启用/增强 DataTable 能力与一致性。
- Users：用户列表与 API Key 列表迁移到 `ResponsiveTable`，补齐移动端卡片视图，修正表单细节。

### 阶段 D（P2：Dashboard 多维数据展示）
- 新增 `components/ui/chart.tsx`（基于 Recharts 的 shadcn 风格封装），统一 Tooltip/Legend/主题色，适配暗色模式。
- Dashboard 增加 cost/successRate/channelStats 等维度展示（按现有 `/api/admin/stats` 字段）。

### 阶段 E（质量把关）
- 逐页检查移动端（`<md`）与桌面（`md+`）体验。
- 运行 `pnpm typecheck`、`pnpm lint`（如环境限制则调整为等价无缓存方式）。

