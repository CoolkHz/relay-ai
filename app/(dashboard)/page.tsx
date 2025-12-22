"use client";

// Usage: main dashboard metrics and charts.
import { useState } from "react";
import useSWR from "swr";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, CreditCard, DollarSign, Zap } from "lucide-react";
import { ErrorState } from "@/components/dashboard/error-state";
import { ResponsiveTable } from "@/components/dashboard/responsive-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartTooltip } from "@/components/ui/chart";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { jsonFetcher } from "@/lib/utils/fetcher";

type TopModelRow = { model: string; requests: number; tokens: number };
type DailyBreakdownRow = {
  date: string;
  requests: number;
  successCount: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
};
type ChannelStatRow = { channelId: number; requests: number; successRate: number; avgLatency: number };
type StatsResponse = {
  summary: {
    totalRequests: number;
    successRequests: number;
    errorRequests: number;
    successRate: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
    avgLatency: number;
  };
  dailyBreakdown: DailyBreakdownRow[];
  topModels: TopModelRow[];
  channelStats: ChannelStatRow[];
};
type ChannelsResponse = { data: Array<{ id: number; name: string }> };

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR<StatsResponse>(
    "/api/admin/stats?days=7",
    (url: string) => jsonFetcher(url) as Promise<StatsResponse>
  );
  const { data: channelsData } = useSWR<ChannelsResponse>(
    "/api/admin/channels",
    (url: string) => jsonFetcher(url) as Promise<ChannelsResponse>
  );
  const [trendMetric, setTrendMetric] = useState<"requests" | "tokens" | "cost" | "successRate">("requests");

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <ErrorState
          message={error}
          className="w-full max-w-md"
        />
      </div>
    );
  }

  const summary = data?.summary;
  const stats = {
    totalRequests: Number(summary?.totalRequests ?? 0),
    successRate: Number(summary?.successRate ?? 0),
    totalInputTokens: Number(summary?.totalInputTokens ?? 0),
    totalOutputTokens: Number(summary?.totalOutputTokens ?? 0),
    totalCost: Number(summary?.totalCost ?? 0),
    avgLatency: Number(summary?.avgLatency ?? 0),
  };
  const successRate = stats.successRate || 0;
  const dailyBreakdown = Array.isArray(data?.dailyBreakdown) ? data.dailyBreakdown : [];
  const channelStats = Array.isArray(data?.channelStats) ? data.channelStats : [];
  const topModels = Array.isArray(data?.topModels) ? data.topModels : [];
  const totalTokens = stats.totalInputTokens + stats.totalOutputTokens;
  const channels = Array.isArray(channelsData?.data) ? channelsData.data : [];
  const channelNameById = new Map(channels.map((c) => [c.id, c.name] as const));

  const chartData = dailyBreakdown.map((day) => ({
    name: day.date?.slice(5) || "",
    requests: Number(day.requests) || 0,
    tokens: Number(day.inputTokens ?? 0) + Number(day.outputTokens ?? 0),
    cost: Number(day.cost ?? 0),
    successRate: Number(day.requests)
      ? (Number(day.successCount ?? 0) / Number(day.requests ?? 0)) * 100
      : 0,
  }));

  const trendChartConfig = {
    requests: { label: "请求量", color: "var(--chart-1)" },
    tokens: { label: "Token", color: "var(--chart-2)" },
    cost: { label: "费用", color: "var(--chart-3)" },
    successRate: { label: "成功率", color: "var(--chart-4)" },
  };

  return (
    <div className="space-y-8 lg:space-y-10">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">仪表盘</h2>
        <p className="text-muted-foreground">API 网关运行状态概览</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总请求数</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="text-2xl font-bold">{(stats.totalRequests || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              成功率 {successRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总 Token</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              输入 {(stats.totalInputTokens || 0).toLocaleString()} / 输出 {(stats.totalOutputTokens || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总费用</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="text-2xl font-bold">${(stats.totalCost || 0).toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">近 7 天汇总</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均延迟</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="text-2xl font-bold">{stats.avgLatency || 0}ms</div>
            <p className="text-xs text-muted-foreground">响应时间</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>概览</CardTitle>
            <CardDescription>近 7 天请求趋势</CardDescription>
          </CardHeader>
          <CardContent className="px-2 pb-6 pt-0 sm:px-6">
            <Tabs
              value={trendMetric}
              onValueChange={(v) => setTrendMetric(v as "requests" | "tokens" | "cost" | "successRate")}
            >
              <TabsList>
                <TabsTrigger value="requests">请求量</TabsTrigger>
                <TabsTrigger value="tokens">Token 用量</TabsTrigger>
                <TabsTrigger value="cost">费用</TabsTrigger>
                <TabsTrigger value="successRate">成功率</TabsTrigger>
              </TabsList>
              <TabsContent value="requests" className="mt-4">
                {chartData.length > 0 ? (
                  <ChartContainer config={trendChartConfig} className="h-[350px]">
                    <BarChart data={chartData}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis
                        dataKey="name"
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => Number(value).toLocaleString()}
                      />
                      <ChartTooltip />
                      <Bar dataKey="requests" fill="var(--color-requests)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                    暂无数据
                  </div>
                )}
              </TabsContent>
              <TabsContent value="tokens" className="mt-4">
                {chartData.length > 0 ? (
                  <ChartContainer config={trendChartConfig} className="h-[350px]">
                    <BarChart data={chartData}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis
                        dataKey="name"
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => Number(value).toLocaleString()}
                      />
                      <ChartTooltip />
                      <Bar dataKey="tokens" fill="var(--color-tokens)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                    暂无数据
                  </div>
                )}
              </TabsContent>
              <TabsContent value="cost" className="mt-4">
                {chartData.length > 0 ? (
                  <ChartContainer config={trendChartConfig} className="h-[350px]">
                    <BarChart data={chartData}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis
                        dataKey="name"
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${Number(value).toFixed(4)}`}
                      />
                      <ChartTooltip />
                      <Bar dataKey="cost" fill="var(--color-cost)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                    暂无数据
                  </div>
                )}
              </TabsContent>
              <TabsContent value="successRate" className="mt-4">
                {chartData.length > 0 ? (
                  <ChartContainer config={trendChartConfig} className="h-[350px]">
                    <LineChart data={chartData}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis
                        dataKey="name"
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                        tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
                      />
                      <ChartTooltip />
                      <ChartLegend />
                      <Line
                        type="monotone"
                        dataKey="successRate"
                        stroke="var(--color-successRate)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                    暂无数据
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>热门模型</CardTitle>
            <CardDescription>按请求数排序</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveTable<TopModelRow>
              data={topModels.slice(0, 5)}
              getRowId={(model, idx) => model.model || idx}
              emptyState="暂无数据"
              tableLabel="热门模型列表"
              columns={[
                {
                  key: "model",
                  header: "模型",
                  cell: (model) => <span className="font-medium">{model.model || "未知"}</span>,
                  sortValue: (model) => model.model || "",
                },
                {
                  key: "requests",
                  header: "请求数",
                  align: "right",
                  cell: (model) => model.requests.toLocaleString(),
                  sortValue: (model) => Number(model.requests) || 0,
                },
                {
                  key: "tokens",
                  header: "Tokens",
                  align: "right",
                  cell: (model) => (Number.isFinite(model.tokens) ? model.tokens.toLocaleString() : "-"),
                  sortValue: (model) => Number(model.tokens) || 0,
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>每日明细</CardTitle>
          <CardDescription>最近 7 天的请求统计</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveTable<DailyBreakdownRow>
            data={dailyBreakdown}
            getRowId={(day) => day.date}
            emptyState="暂无数据"
            tableLabel="每日明细"
            enableColumnVisibility
            columns={[
              {
                key: "date",
                header: "日期",
                cell: (day) => <span className="font-medium">{day.date}</span>,
                sortValue: (day) => day.date,
              },
              {
                key: "requests",
                header: "请求数",
                align: "right",
                cell: (day) => day.requests.toLocaleString(),
                sortValue: (day) => Number(day.requests) || 0,
              },
              {
                key: "successCount",
                header: "成功数",
                align: "right",
                cell: (day) => day.successCount.toLocaleString(),
                sortValue: (day) => Number(day.successCount) || 0,
              },
              {
                key: "successRate",
                header: "成功率",
                align: "right",
                cell: (day) => {
                  const rate = day.requests > 0 ? ((day.successCount / day.requests) * 100).toFixed(1) : "0.0";
                  return `${rate}%`;
                },
                sortValue: (day) => (day.requests > 0 ? day.successCount / day.requests : 0),
              },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>渠道表现</CardTitle>
          <CardDescription>近 7 天渠道请求量、成功率与延迟</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveTable<ChannelStatRow>
            data={[...channelStats].sort((a, b) => (b.requests || 0) - (a.requests || 0)).slice(0, 10)}
            getRowId={(stat, idx) => stat.channelId ?? idx}
            emptyState="暂无数据"
            tableLabel="渠道表现"
            columns={[
              {
                key: "channel",
                header: "渠道",
                cell: (stat) => (
                  <div>
                    <p className="text-sm font-medium">
                      {channelNameById.get(stat.channelId) || `渠道 #${stat.channelId}`}
                    </p>
                    <p className="text-xs text-muted-foreground">ID: {stat.channelId}</p>
                  </div>
                ),
                sortValue: (stat) => channelNameById.get(stat.channelId) || String(stat.channelId),
              },
              {
                key: "requests",
                header: "请求数",
                align: "right",
                cell: (stat) => Number(stat.requests ?? 0).toLocaleString(),
                sortValue: (stat) => Number(stat.requests ?? 0),
              },
              {
                key: "successRate",
                header: "成功率",
                align: "right",
                cell: (stat) => `${Number(stat.successRate ?? 0).toFixed(1)}%`,
                sortValue: (stat) => Number(stat.successRate ?? 0),
              },
              {
                key: "avgLatency",
                header: "平均延迟",
                align: "right",
                cell: (stat) => `${Number(stat.avgLatency ?? 0)}ms`,
                sortValue: (stat) => Number(stat.avgLatency ?? 0),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
