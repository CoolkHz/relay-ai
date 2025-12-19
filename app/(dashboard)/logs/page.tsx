"use client";

// Usage: request logs with filters and responsive table.
import { useState } from "react";
import useSWR from "swr";
import { Clock, Cpu, DollarSign, FileText, RefreshCw, Search, Zap } from "lucide-react";

import { FormField } from "@/components/dashboard/form-field";
import { PageHeader } from "@/components/dashboard/page-header";
import { ResponsiveTable } from "@/components/dashboard/responsive-table";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Log {
  id: number;
  userId: number;
  channelId: number;
  requestModel: string;
  actualModel: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: string;
  latency: number;
  status: string;
  errorMessage?: string;
  ip?: string;
  createdAt: string;
}

const statusOptions = [
  { key: "success", label: "成功" },
  { key: "error", label: "错误" },
];

export default function LogsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ userId: "", channelId: "", status: "" });

  const params = new URLSearchParams({ page: String(page), limit: "50" });
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.channelId) params.set("channelId", filters.channelId);
  if (filters.status) params.set("status", filters.status);

  const { data, isLoading, mutate } = useSWR(`/api/admin/logs?${params}`, fetcher);

  const totalPages = Math.ceil((data?.pagination?.total || 0) / 50);
  const logs = Array.isArray(data?.data) ? (data.data as Log[]) : [];

  // Calculate stats
  const successCount = logs.filter((log: Log) => log.status === "success").length || 0;
  const errorCount = logs.filter((log: Log) => log.status === "error").length || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="请求日志"
        description="监控 API 请求和响应"
        actions={
          <Button variant="secondary" className="gap-2" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]">
          <FormField label="用户 ID" htmlFor="log-user-id">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="log-user-id"
                value={filters.userId}
                onChange={(event) => {
                  setFilters({ ...filters, userId: event.target.value });
                  setPage(1);
                }}
                placeholder="按用户筛选"
                className="pl-9"
              />
            </div>
          </FormField>
          <FormField label="渠道 ID" htmlFor="log-channel-id">
            <Input
              id="log-channel-id"
              value={filters.channelId}
              onChange={(event) => {
                setFilters({ ...filters, channelId: event.target.value });
                setPage(1);
              }}
              placeholder="按渠道筛选"
            />
          </FormField>
          <FormField label="状态" htmlFor="log-status">
            <Select
              value={filters.status}
              onValueChange={(value) => {
                setFilters({ ...filters, status: value });
                setPage(1);
              }}
            >
              <SelectTrigger id="log-status">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <div className="flex flex-wrap items-end gap-2 text-xs">
            <Badge variant="success" className="gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {successCount} 成功
            </Badge>
            <Badge variant="destructive" className="gap-2">
              <span className="h-2 w-2 rounded-full bg-destructive" />
              {errorCount} 错误
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <SectionHeader
            title="请求历史"
            description="近实时调用明细与状态"
            icon={<FileText className="h-4 w-4" />}
            count={data?.pagination?.total || 0}
          />
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <ResponsiveTable
              data={logs}
              getRowId={(log) => log.id}
              emptyState="暂无日志"
              tableLabel="请求日志列表"
              columns={[
                {
                  key: "time",
                  header: "时间",
                  cell: (log) => (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  ),
                },
                {
                  key: "model",
                  header: "模型",
                  cell: (log) => (
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-semibold font-mono">{log.requestModel}</p>
                        {log.actualModel !== log.requestModel ? (
                          <p className="text-xs text-muted-foreground">→ {log.actualModel}</p>
                        ) : null}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "tokens",
                  header: "Token",
                  align: "right",
                  cell: (log) => (
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1 text-sm font-medium">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        {log.totalTokens?.toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {log.inputTokens?.toLocaleString()} in / {log.outputTokens?.toLocaleString()} out
                      </p>
                    </div>
                  ),
                },
                {
                  key: "cost",
                  header: "费用",
                  align: "right",
                  cell: (log) => (
                    <div className="flex items-center justify-end gap-1 text-sm font-medium">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                      {Number(log.cost).toFixed(6)}
                    </div>
                  ),
                },
                {
                  key: "latency",
                  header: "延迟",
                  align: "right",
                  cell: (log) => (
                    <Badge
                      variant={
                        log.latency < 1000 ? "success" : log.latency < 3000 ? "warning" : "destructive"
                      }
                    >
                      {log.latency}ms
                    </Badge>
                  ),
                },
                {
                  key: "status",
                  header: "状态",
                  cell: (log) => (
                    <div className="space-y-1">
                      <Badge variant={log.status === "success" ? "success" : "destructive"}>
                        {log.status}
                      </Badge>
                      {log.errorMessage ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block max-w-[180px] truncate text-xs text-destructive">
                              {log.errorMessage}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{log.errorMessage}</TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  ),
                },
                {
                  key: "user",
                  header: "用户 / 渠道",
                  cell: (log) => (
                    <div className="text-sm">
                      <p>
                        用户: <span className="font-medium">{log.userId || "-"}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">渠道: {log.channelId || "-"}</p>
                    </div>
                  ),
                },
              ]}
              renderMobileCard={(log) => (
                <Card className="border border-border/60">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold font-mono">{log.requestModel}</p>
                        {log.actualModel !== log.requestModel ? (
                          <p className="text-xs text-muted-foreground">→ {log.actualModel}</p>
                        ) : null}
                      </div>
                      <Badge variant={log.status === "success" ? "success" : "destructive"}>
                        {log.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg bg-muted/60 p-2 text-xs">
                        <p className="text-muted-foreground">Tokens</p>
                        <p className="font-medium">{log.totalTokens?.toLocaleString()}</p>
                      </div>
                      <div className="rounded-lg bg-muted/60 p-2 text-xs">
                        <p className="text-muted-foreground">费用</p>
                        <p className="font-medium">{Number(log.cost).toFixed(6)}</p>
                      </div>
                      <div className="rounded-lg bg-muted/60 p-2 text-xs">
                        <p className="text-muted-foreground">延迟</p>
                        <p className="font-medium">{log.latency}ms</p>
                      </div>
                      <div className="rounded-lg bg-muted/60 p-2 text-xs">
                        <p className="text-muted-foreground">用户 / 渠道</p>
                        <p className="font-medium">
                          {log.userId || "-"} / {log.channelId || "-"}
                        </p>
                      </div>
                    </div>
                    {log.errorMessage ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="truncate text-xs text-destructive">{log.errorMessage}</p>
                        </TooltipTrigger>
                        <TooltipContent>{log.errorMessage}</TooltipContent>
                      </Tooltip>
                    ) : null}
                  </CardContent>
                </Card>
              )}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          显示 {((page - 1) * 50) + 1} - {Math.min(page * 50, data?.pagination?.total || 0)} 条，共{" "}
          {data?.pagination?.total || 0} 条记录
        </p>
        {totalPages > 1 ? (
          <Pagination total={totalPages} page={page} onChange={setPage} showControls />
        ) : null}
      </div>
    </div>
  );
}
