"use client";

// Usage: main dashboard metrics and charts.
import { useState } from "react";
import useSWR from "swr";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, CreditCard, DollarSign, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR("/api/admin/stats?days=7", fetcher);
  const [trendMetric, setTrendMetric] = useState<"requests" | "tokens">("requests");

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || data?.error) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">加载失败</CardTitle>
            <CardDescription>
              {(error as Error | undefined)?.message || data?.error || "无法加载统计数据，请稍后重试"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const summary = data?.summary || {};
  const stats = {
    totalRequests: Number(summary.totalRequests ?? 0),
    successRate: Number(summary.successRate ?? 0),
    totalInputTokens: Number(summary.totalInputTokens ?? 0),
    totalOutputTokens: Number(summary.totalOutputTokens ?? 0),
    totalCost: Number(summary.totalCost ?? 0),
    avgLatency: Number(summary.avgLatency ?? 0),
  };
  const successRate = stats.successRate || 0;
  const dailyBreakdown = Array.isArray(data?.dailyBreakdown) ? data.dailyBreakdown : [];
  const totalTokens = stats.totalInputTokens + stats.totalOutputTokens;

  const chartData = dailyBreakdown.map((day: { date: string; requests?: number; successCount?: number }) => ({
    name: day.date?.slice(5) || "",
    requests: Number(day.requests) || 0,
    tokens: Math.round(totalTokens / Math.max(dailyBreakdown.length, 1)),
  }));

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
            <Tabs value={trendMetric} onValueChange={(v) => setTrendMetric(v as "requests" | "tokens")}>
              <TabsList>
                <TabsTrigger value="requests">请求量</TabsTrigger>
                <TabsTrigger value="tokens">Token 用量</TabsTrigger>
              </TabsList>
              <TabsContent value="requests" className="mt-4">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                      <Bar dataKey="requests" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                    暂无数据
                  </div>
                )}
              </TabsContent>
              <TabsContent value="tokens" className="mt-4">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                      <Bar dataKey="tokens" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
                    </BarChart>
                  </ResponsiveContainer>
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
            {data?.topModels?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>模型</TableHead>
                    <TableHead className="text-right">请求数</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topModels.slice(0, 5).map((model: { model: string; requests: number; tokens: number }, idx: number) => (
                    <TableRow key={model.model || idx}>
                      <TableCell className="font-medium">{model.model || "未知"}</TableCell>
                      <TableCell className="text-right">{model.requests.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{model.tokens?.toLocaleString() || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>每日明细</CardTitle>
          <CardDescription>最近 7 天的请求统计</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyBreakdown.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead className="text-right">请求数</TableHead>
                  <TableHead className="text-right">成功数</TableHead>
                  <TableHead className="text-right">成功率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyBreakdown.map((day: { date: string; requests: number; successCount: number }) => {
                  const rate = day.requests > 0 ? ((day.successCount / day.requests) * 100).toFixed(1) : "0.0";
                  return (
                    <TableRow key={day.date}>
                      <TableCell className="font-medium">{day.date}</TableCell>
                      <TableCell className="text-right">{day.requests.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{day.successCount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{rate}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
              暂无数据
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
