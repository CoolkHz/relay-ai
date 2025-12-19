# AntiHub 设计风格分析

## 核心设计特点

### 1. 颜色系统
- 使用 **OKLCH 色彩空间**（比 HSL 更现代）
- 极简的黑白灰配色
- 暗色模式优先设计
- 自定义设计系统颜色（`--ds-*` 变量）

### 2. 布局特点
- **Sidebar + Inset 布局**（使用 shadcn/ui sidebar 组件）
- 固定头部高度：`--header-height: calc(var(--spacing) * 12)`
- 固定侧边栏宽度：`--sidebar-width: calc(var(--spacing) * 72)`
- 使用 `@container` 查询实现响应式

### 3. Card 组件设计
- **CardAction**：右上角操作区（图标 Badge）
- 渐变背景：`bg-gradient-to-t from-primary/5 to-card`
- 圆角：`rounded-xl`
- 阴影：`shadow-xs`
- 使用 `data-slot` 属性标记组件部分

### 4. 统计卡片布局
```tsx
<Card>
  <CardHeader>
    <CardDescription>标题</CardDescription>
    <CardTitle>数值</CardTitle>
    <CardAction>
      <Badge variant="outline">
        <Icon />
      </Badge>
    </CardAction>
  </CardHeader>
  <CardFooter>
    <div>详细信息</div>
    <div className="text-muted-foreground">描述</div>
  </CardFooter>
</Card>
```

### 5. 图标系统
- 使用 **@tabler/icons-react**（而非 lucide-react）
- 图标尺寸：`size-4`（16px）

### 6. 字体
- Geist Sans（主字体）
- Geist Mono（等宽字体）

### 7. 动画与交互
- 使用 `tw-animate-css` 库
- `MorphingSquare` 加载动画
- 主题切换动画：`AnimatedThemeToggler`

### 8. 响应式设计
- 使用 `@container` 查询
- 断点：`@xl/main`、`@5xl/main`、`@[250px]/card`

## 与当前项目的差异

| 特性 | 当前项目 | AntiHub |
|------|---------|---------|
| 色彩空间 | HSL | OKLCH |
| 图标库 | lucide-react | @tabler/icons-react |
| 布局 | 自定义 | shadcn/ui Sidebar |
| Card 设计 | 标准 | 带 CardAction |
| 渐变 | 无 | 轻微渐变 |
| 容器查询 | 无 | 广泛使用 |

## 重构计划

### 阶段 1：更新全局样式
- [ ] 更新 `globals.css` 使用 OKLCH 色彩空间
- [ ] 添加 AntiHub 的设计系统颜色变量
- [ ] 更新 Card 组件添加 CardAction

### 阶段 2：更新布局
- [ ] 使用 shadcn/ui Sidebar 组件
- [ ] 创建 AppSidebar 组件
- [ ] 创建 SiteHeader 组件
- [ ] 更新 Dashboard Layout

### 阶段 3：重构页面
- [ ] Dashboard 页面（统计卡片 + 图表）
- [ ] Channels 页面
- [ ] Groups 页面
- [ ] Models 页面
- [ ] Users 页面
- [ ] Logs 页面

### 阶段 4：安装依赖
```bash
pnpm add @tabler/icons-react tw-animate-css
```
