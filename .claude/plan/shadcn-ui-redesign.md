# shadcn/ui 官方风格重构计划

## 设计原则

采用 shadcn/ui 简洁标准风格：
- 移除所有渐变背景（`bg-gradient-to-*`）
- 移除圆角装饰（`rounded-xl` → `rounded-lg`）
- 移除图标背景色块
- 简化 Badge 样式（移除 `border-0`）
- 统一间距（使用标准 `space-y-4`、`gap-4`）
- 移除过度装饰的 Card 样式

## 重构清单

### 1. Dashboard 页面 (`app/(dashboard)/page.tsx`)
- [ ] 移除头部 Card 的渐变背景
- [ ] 简化 KpiCard 组件（移除图标背景、简化布局）
- [ ] 移除图表渐变填充，使用纯色
- [ ] 简化每日概览的进度条样式
- [ ] 统一 Card 边框样式

### 2. Channels 页面 (`app/(dashboard)/channels/page.tsx`)
- [ ] 使用 PageHeader 组件
- [ ] 简化统计卡片样式
- [ ] 移除图标背景色块
- [ ] 统一表格样式

### 3. Groups 页面 (`app/(dashboard)/groups/page.tsx`)
- [ ] 使用 PageHeader 组件
- [ ] 简化表单样式
- [ ] 统一 Dialog 样式

### 4. Models 页面 (`app/(dashboard)/models/page.tsx`)
- [ ] 使用 PageHeader 组件
- [ ] 简化统计卡片
- [ ] 统一表格样式

### 5. Users 页面 (`app/(dashboard)/users/page.tsx`)
- [ ] 简化头部样式
- [ ] 移除 Avatar 渐变背景
- [ ] 统一 Dialog 样式

### 6. Logs 页面 (`app/(dashboard)/logs/page.tsx`)
- [ ] 使用 PageHeader 组件
- [ ] 简化表格样式
- [ ] 统一筛选器样式

## 共享组件更新

### PageHeader (`components/dashboard/page-header.tsx`)
```tsx
// 简化版本
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
    {description && <p className="text-muted-foreground">{description}</p>}
  </div>
  {actions}
</div>
```

### SectionHeader (`components/dashboard/section-header.tsx`)
```tsx
// 移除图标背景
<div className="flex items-center justify-between">
  <div className="flex items-center gap-2">
    {icon}
    <h2 className="text-lg font-semibold">{title}</h2>
  </div>
  {count !== undefined && <Badge variant="secondary">{count}</Badge>}
</div>
```

## 样式规范

### Card
```tsx
<Card> // 默认样式，无需额外 className
  <CardHeader>
    <CardTitle>标题</CardTitle>
    <CardDescription>描述</CardDescription>
  </CardHeader>
  <CardContent>内容</CardContent>
</Card>
```

### Badge
```tsx
<Badge variant="default">默认</Badge>
<Badge variant="secondary">次要</Badge>
<Badge variant="destructive">危险</Badge>
<Badge variant="outline">轮廓</Badge>
```

### Button
```tsx
<Button>默认</Button>
<Button variant="secondary">次要</Button>
<Button variant="outline">轮廓</Button>
<Button variant="ghost">幽灵</Button>
```

### 间距
- 页面级：`space-y-8`
- 区块级：`space-y-4`
- 元素级：`gap-2` 或 `gap-4`
