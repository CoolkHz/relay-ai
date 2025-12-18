"use client";

import useSWR from "swr";
import { Card, CardBody, CardHeader, Spinner, Progress } from "@heroui/react";
import { Icon } from "@iconify/react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DashboardPage() {
  const { data, isLoading } = useSWR("/api/admin/stats?days=7", fetcher);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const stats = data?.summary || {};
  const successRate = stats.successRate || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">仪表盘</h1>
        <p className="text-default-500 text-sm mt-0.5">监控 API 网关性能</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="总请求数"
          value={stats.totalRequests?.toLocaleString() || "0"}
          icon="solar:chart-2-linear"
          color="primary"
          trend={successRate >= 95 ? "up" : "down"}
          trendValue={`${successRate.toFixed(1)}% 成功率`}
        />
        <StatCard
          title="总 Token"
          value={((stats.totalInputTokens || 0) + (stats.totalOutputTokens || 0)).toLocaleString()}
          icon="solar:bolt-linear"
          color="secondary"
          subtitle={`输入: ${(stats.totalInputTokens || 0).toLocaleString()} / 输出: ${(stats.totalOutputTokens || 0).toLocaleString()}`}
        />
        <StatCard
          title="总费用"
          value={`$${(stats.totalCost || 0).toFixed(4)}`}
          icon="solar:dollar-minimalistic-linear"
          color="success"
          subtitle="最近 7 天"
        />
        <StatCard
          title="平均延迟"
          value={`${stats.avgLatency || 0}ms`}
          icon="solar:clock-circle-linear"
          color="warning"
          subtitle="响应时间"
        />
      </div>

      <Card>
        <CardBody className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold">成功率</h3>
              <p className="text-xs text-default-500">API 请求成功百分比</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-success">{successRate.toFixed(1)}%</p>
              <p className="text-[10px] text-default-400">目标: 99.9%</p>
            </div>
          </div>
          <Progress 
            value={successRate} 
            color={successRate >= 95 ? "success" : successRate >= 80 ? "warning" : "danger"}
            className="h-2"
          />
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-col items-start px-5 pt-5 pb-0">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                <Icon icon="solar:graph-up-linear" className="text-primary" width={14} />
              </div>
              <h3 className="text-base font-semibold">每日请求</h3>
            </div>
            <p className="text-xs text-default-500 mt-0.5">最近 7 天的请求量</p>
          </CardHeader>
          <CardBody className="px-5 pb-5">
            <div className="space-y-2.5 mt-3">
              {data?.dailyBreakdown?.map((day: { date: string; requests: number; successCount: number }) => {
                const maxReq = Math.max(...(data?.dailyBreakdown?.map((d: { requests: number }) => d.requests) || [1]));
                const pct = (day.requests / maxReq) * 100;
                const successPct = day.requests > 0 ? (day.successCount / day.requests) * 100 : 0;
                return (
                  <div key={day.date}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-default-600">{day.date}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-medium">{day.requests.toLocaleString()}</span>
                        <span className="text-success">{successPct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-default-100 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {!data?.dailyBreakdown?.length && (
                <div className="flex flex-col items-center justify-center py-6 text-default-400">
                  <Icon icon="solar:chart-2-linear" width={28} className="mb-2 opacity-50" />
                  <p className="text-sm">暂无数据</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex-col items-start px-5 pt-5 pb-0">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary/10">
                <Icon icon="solar:bolt-linear" className="text-secondary" width={14} />
              </div>
              <h3 className="text-base font-semibold">热门模型</h3>
            </div>
            <p className="text-xs text-default-500 mt-0.5">按请求数排序</p>
          </CardHeader>
          <CardBody className="px-5 pb-5">
            <div className="space-y-3 mt-3">
              {data?.topModels?.map((model: { model: string; requests: number; tokens: number }, idx: number) => {
                const maxReq = data?.topModels?.[0]?.requests || 1;
                const pct = (model.requests / maxReq) * 100;
                const colors: Array<"primary" | "secondary" | "success" | "warning" | "danger"> = ["primary", "secondary", "success", "warning", "danger"];
                return (
                  <div key={model.model}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium">{model.model || "未知"}</span>
                      <div className="flex items-center gap-3 text-xs text-default-500">
                        <span>{model.requests.toLocaleString()} 次</span>
                        <span>{model.tokens?.toLocaleString()} tokens</span>
                      </div>
                    </div>
                    <Progress value={pct} size="sm" color={colors[idx % colors.length]} />
                  </div>
                );
              })}
              {!data?.topModels?.length && (
                <div className="flex flex-col items-center justify-center py-6 text-default-400">
                  <Icon icon="solar:bolt-linear" width={28} className="mb-2 opacity-50" />
                  <p className="text-sm">暂无数据</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title, value, icon, color, trend, trendValue, subtitle,
}: {
  title: string;
  value: string;
  icon: string;
  color: "primary" | "secondary" | "success" | "warning";
  trend?: "up" | "down";
  trendValue?: string;
  subtitle?: string;
}) {
  const colorMap = {
    primary: "from-primary/20 to-primary/5 text-primary",
    secondary: "from-secondary/20 to-secondary/5 text-secondary",
    success: "from-success/20 to-success/5 text-success",
    warning: "from-warning/20 to-warning/5 text-warning",
  };

  return (
    <Card>
      <CardBody className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-default-500 font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1 truncate">{value}</p>
            {trend && trendValue && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${trend === "up" ? "text-success" : "text-danger"}`}>
                <Icon icon={trend === "up" ? "solar:arrow-up-linear" : "solar:arrow-down-linear"} width={12} />
                <span>{trendValue}</span>
              </div>
            )}
            {subtitle && !trend && <p className="text-[10px] text-default-400 mt-1 truncate">{subtitle}</p>}
          </div>
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${colorMap[color]}`}>
            <Icon icon={icon} width={20} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
