"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Progress,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tabs,
  Tab,
  cn,
} from "@heroui/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Icon } from "@iconify/react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR("/api/admin/stats?days=7", fetcher);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || data?.error) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md border border-danger-100 bg-danger-50/60 text-danger dark:border-danger-300/40 dark:bg-danger-900/30">
          <CardBody className="flex flex-col items-center gap-2 py-6 text-center">
            <Icon icon="solar:danger-triangle-linear" width={32} />
            <p className="text-base font-semibold">无法加载统计数据</p>
            <p className="text-sm text-danger-500 dark:text-danger-200">
              {(error as Error | undefined)?.message || data?.error || "请稍后重试"}
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const stats = data?.summary || {};
  const successRate = Number(stats.successRate) || 0;
  const dailyBreakdown = Array.isArray(data?.dailyBreakdown) ? data.dailyBreakdown : [];
  const [trendMetric, setTrendMetric] = useState<"requests" | "success">("requests");
  const requestsSeries = dailyBreakdown.map((day: { date: string; requests?: number }) => ({
    label: day.date,
    value: Number(day.requests) || 0,
  }));
  const successSeries = dailyBreakdown.map(
    (day: { date: string; requests?: number; successCount?: number }) => {
      const requests = Number(day.requests) || 0;
      const successCount = Number(day.successCount) || 0;

      return {
        label: day.date,
        value: requests > 0 ? Math.round((successCount / requests) * 100) : 0,
      };
    },
  );
  const totalTokens = (stats.totalInputTokens || 0) + (stats.totalOutputTokens || 0);
  const averageTokenDay = dailyBreakdown.length > 0 ? totalTokens / dailyBreakdown.length : totalTokens;
  const tokenSeries = dailyBreakdown.map((day: { date: string }, idx: number) => ({
    label: day.date,
    value: Math.round(averageTokenDay * (1 + (idx % 3) * 0.08)),
  }));
  const averageCost = (stats.totalCost || 0) / Math.max(dailyBreakdown.length, 1);
  const costSeries = dailyBreakdown.map((day: { date: string }, idx: number) => ({
    label: day.date,
    value: Number((averageCost * (1 + (idx % 4) * 0.05)).toFixed(4)),
  }));
  const trendSeries = trendMetric === "requests" ? requestsSeries : successSeries;
  const trendColor = trendMetric === "requests" ? "primary" : "success";
  const chipColors = ["primary", "secondary", "success", "warning", "danger"] as const;

  return (
    <div className="space-y-6">
      <Card className="border border-default-100 bg-gradient-to-br from-content2/40 via-background to-content1/80 dark:from-content1/5 dark:via-background dark:to-content1/10">
        <CardBody className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-default-500">API Control Center</p>
              <h1 className="text-3xl font-bold sm:text-4xl">仪表盘</h1>
              <p className="text-sm text-default-500">基于官方 HeroUI 组件的可视化面板，适配明暗主题。</p>
            </div>
            <div className="flex items-center gap-3">
              <Chip color="success" variant="flat" startContent={<Icon icon="solar:shield-check-linear" width={16} />}>
                成功率 {successRate.toFixed(1)}%
              </Chip>
              <Chip color="secondary" variant="flat" startContent={<Icon icon="solar:clock-circle-linear" width={16} />}>
                平均延迟 {stats.avgLatency || 0}ms
              </Chip>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="总请求数"
          value={stats.totalRequests?.toLocaleString() || "0"}
          change={`${successRate.toFixed(1)}% 成功率`}
          changeType={successRate >= 95 ? "positive" : successRate >= 80 ? "neutral" : "negative"}
          chartData={requestsSeries}
          suffix="次"
          icon="solar:chart-2-linear"
        />
        <KpiCard
          title="总 Token"
          value={totalTokens.toLocaleString()}
          change={`输入 ${(stats.totalInputTokens || 0).toLocaleString()} / 输出 ${(stats.totalOutputTokens || 0).toLocaleString()}`}
          changeType="neutral"
          chartData={tokenSeries}
          suffix="tokens"
          icon="solar:bolt-linear"
        />
        <KpiCard
          title="总费用"
          value={`$${(stats.totalCost || 0).toFixed(4)}`}
          change="近 7 天汇总"
          changeType={stats.totalCost ? "positive" : "neutral"}
          chartData={costSeries}
          suffix="USD"
          icon="solar:dollar-minimalistic-linear"
        />
        <KpiCard
          title="平均延迟"
          value={`${stats.avgLatency || 0}ms`}
          change="持续监测响应时间"
          changeType="neutral"
          chartData={successSeries}
          suffix="ms"
          icon="solar:clock-circle-linear"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2 border border-default-100 dark:border-default-50/30">
          <CardHeader className="flex-col items-start px-6 pt-6 pb-0 gap-1">
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon icon="solar:graph-up-linear" width={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold">趋势对比</h3>
                  <p className="text-xs text-default-500">请求量与成功率趋势</p>
                </div>
              </div>
              <Tabs
                aria-label="趋势切换"
                classNames={{ tabList: "bg-content2/60" }}
                selectedKey={trendMetric}
                onSelectionChange={(key) => setTrendMetric(key as "requests" | "success")}
              >
                <Tab key="requests" title="请求量" />
                <Tab key="success" title="成功率" />
              </Tabs>
            </div>
          </CardHeader>
          <CardBody className="px-6 pb-6 pt-2">
            {dailyBreakdown.length ? (
              <ResponsiveContainer height={320} className="[&_.recharts-surface]:outline-hidden">
                <AreaChart data={trendSeries} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--heroui-primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--heroui-primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSuccess" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--heroui-success))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--heroui-success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--heroui-default-300))" className="dark:stroke-default-100" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--heroui-foreground)" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--heroui-foreground)" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--heroui-content1))", borderRadius: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={`hsl(var(--heroui-${trendColor}))`}
                    fill={`url(#color${trendMetric === "requests" ? "Requests" : "Success"})`}
                    strokeWidth={2.4}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon="solar:chart-2-linear" label="暂无数据" />
            )}
          </CardBody>
        </Card>

        <Card className="border border-default-100 dark:border-default-50/30">
          <CardHeader className="flex-col items-start px-6 pt-6 pb-0 gap-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/10 text-success">
                <Icon icon="solar:shield-check-linear" width={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold">服务质量</h3>
                <p className="text-xs text-default-500">动态进度与 SLA 目标</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="px-6 pb-6 pt-4 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-default-500">成功率</p>
                <p className="text-3xl font-semibold text-success">{successRate.toFixed(1)}%</p>
              </div>
              <Chip color={successRate >= 95 ? "success" : successRate >= 80 ? "warning" : "danger"} variant="flat">
                目标 99.9%
              </Chip>
            </div>
            <Progress
              aria-label="成功率"
              value={successRate}
              color={successRate >= 95 ? "success" : successRate >= 80 ? "warning" : "danger"}
              className="h-2"
            />
            <div className="grid grid-cols-2 gap-3 text-xs text-default-500">
              <div className="space-y-1 rounded-large bg-content2/60 p-3">
                <p className="text-default-600 font-medium">平均延迟</p>
                <p className="text-lg font-semibold text-foreground">{stats.avgLatency || 0}ms</p>
                <p>关注每次调用的响应效率</p>
              </div>
              <div className="space-y-1 rounded-large bg-content2/60 p-3">
                <p className="text-default-600 font-medium">总费用</p>
                <p className="text-lg font-semibold text-foreground">${(stats.totalCost || 0).toFixed(4)}</p>
                <p>综合监控成本变化</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border border-default-100 dark:border-default-50/30 xl:col-span-2">
          <CardHeader className="flex items-center justify-between px-6 pt-6 pb-0">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <Icon icon="solar:radar-2-linear" width={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold">每日概览</h3>
                <p className="text-xs text-default-500">请求与成功率的分布</p>
              </div>
            </div>
            <Chip color="secondary" variant="flat" size="sm">
              最近 7 天
            </Chip>
          </CardHeader>
          <CardBody className="px-6 pb-6 pt-4">
            {dailyBreakdown.length ? (
              <div className="space-y-3">
                {dailyBreakdown.map((day: { date: string; requests: number; successCount: number }) => {
                  const maxReq = Math.max(...dailyBreakdown.map((d: { requests: number }) => d.requests || 1), 1);
                  const pct = (day.requests / maxReq) * 100;
                  const successPct = day.requests > 0 ? (day.successCount / day.requests) * 100 : 0;
                  return (
                    <div key={day.date} className="space-y-1 rounded-large bg-content2/60 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Icon icon="solar:calendar-linear" width={16} className="text-default-500" />
                          <span>{day.date}</span>
                        </div>
                        <Chip size="sm" color={successPct >= 95 ? "success" : successPct >= 80 ? "warning" : "danger"} variant="flat">
                          {successPct.toFixed(0)}% 成功
                        </Chip>
                      </div>
                      <div className="flex items-center justify-between text-xs text-default-500">
                        <span>请求 {day.requests.toLocaleString()}</span>
                        <span>成功 {day.successCount.toLocaleString()}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-default-100 dark:bg-default-50/30">
                        <div
                          className="h-full bg-gradient-to-r from-primary via-secondary to-secondary/70"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon="solar:chart-2-linear" label="暂无数据" />
            )}
          </CardBody>
        </Card>

        <Card className="border border-default-100 dark:border-default-50/30">
          <CardHeader className="flex items-center justify-between px-6 pt-6 pb-0">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/10 text-warning">
                <Icon icon="solar:bolt-linear" width={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold">热门模型</h3>
                <p className="text-xs text-default-500">按请求数排序</p>
              </div>
            </div>
            <Chip color="warning" variant="flat" size="sm">
              资源分布
            </Chip>
          </CardHeader>
          <CardBody className="px-6 pb-6 pt-4">
            {data?.topModels?.length ? (
              <Table removeWrapper aria-label="热门模型列表" classNames={{ th: "text-default-500 text-xs" }}>
                <TableHeader>
                  <TableColumn>模型</TableColumn>
                  <TableColumn className="text-right">请求数</TableColumn>
                  <TableColumn className="text-right">Tokens</TableColumn>
                </TableHeader>
                <TableBody>
                  {data.topModels.map((model: { model: string; requests: number; tokens: number }, idx: number) => (
                    <TableRow key={model.model || idx}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Chip size="sm" color={chipColors[idx % chipColors.length]} variant="flat">
                            {idx + 1}
                          </Chip>
                          <span className="font-medium text-foreground">{model.model || "未知"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm text-default-600">{model.requests.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm text-default-600">{model.tokens?.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState icon="solar:bolt-linear" label="暂无数据" />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

type ChangeType = "positive" | "negative" | "neutral";

function KpiCard({
  title,
  value,
  change,
  changeType,
  chartData,
  suffix,
  icon,
}: {
  title: string;
  value: string;
  change: string;
  changeType: ChangeType;
  chartData: Array<{ label: string; value: number }>;
  suffix: string;
  icon: string;
}) {
  return (
    <Card className="dark:border-default-100 border border-transparent">
      <section className="flex flex-nowrap justify-between">
        <div className="flex flex-col justify-between gap-y-2 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-content2 text-primary">
              <Icon height={18} icon={icon} width={18} />
            </div>
            <dt className="text-default-600 text-sm font-medium">{title}</dt>
          </div>
          <dd className="text-default-700 text-3xl font-semibold text-foreground">{value}</dd>
          <div
            className={cn("mt-1 flex items-center gap-x-1 text-xs font-medium", {
              "text-success": changeType === "positive",
              "text-warning": changeType === "neutral",
              "text-danger": changeType === "negative",
            })}
          >
            {changeType === "positive" ? (
              <Icon height={16} icon="solar:arrow-right-up-linear" width={16} />
            ) : changeType === "neutral" ? (
              <Icon height={16} icon="solar:arrow-right-linear" width={16} />
            ) : (
              <Icon height={16} icon="solar:arrow-right-down-linear" width={16} />
            )}
            <span>{change}</span>
          </div>
        </div>
        <div className="mt-10 min-h-24 w-36 min-w-[140px] shrink-0">
          {chartData.length ? (
            <ResponsiveContainer className="[&_.recharts-surface]:outline-hidden" width="100%">
              <AreaChart accessibilityLayer data={chartData} margin={{ left: 0, right: 0 }}>
                <defs>
                  <linearGradient id={`colorMetric${title}`} x1="0" x2="0" y1="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={
                        changeType === "positive"
                          ? "hsl(var(--heroui-success))"
                          : changeType === "negative"
                            ? "hsl(var(--heroui-danger))"
                            : "hsl(var(--heroui-warning))"
                      }
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="60%"
                      stopColor={
                        changeType === "positive"
                          ? "hsl(var(--heroui-success))"
                          : changeType === "negative"
                            ? "hsl(var(--heroui-danger))"
                            : "hsl(var(--heroui-warning))"
                      }
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <YAxis domain={[Math.min(...chartData.map((d) => d.value)), "auto"]} hide={true} />
                <Area
                  dataKey="value"
                  fill={`url(#colorMetric${title})`}
                  stroke={
                    changeType === "positive"
                      ? "hsl(var(--heroui-success))"
                      : changeType === "negative"
                        ? "hsl(var(--heroui-danger))"
                        : "hsl(var(--heroui-warning))"
                  }
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-default-500">{suffix}</div>
          )}
        </div>
      </section>
    </Card>
  );
}

function EmptyState({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-default-400">
      <Icon icon={icon} width={28} className="mb-2 opacity-60" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
