"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Card,
  CardBody,
  CardHeader,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Button,
  Input,
  Select,
  SelectItem,
  Pagination,
  Spinner,
  Tooltip,
} from "@heroui/react";
import { Search, FileText, RefreshCw, Clock, Cpu, DollarSign, Zap } from "lucide-react";

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
  { key: "", label: "全部状态" },
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

  // Calculate stats
  const successCount = data?.data?.filter((l: Log) => l.status === "success").length || 0;
  const errorCount = data?.data?.filter((l: Log) => l.status === "error").length || 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">请求日志</h1>
          <p className="text-default-500 text-sm mt-0.5">监控 API 请求和响应</p>
        </div>
        <Button 
          variant="flat" 
          startContent={<RefreshCw size={16} />} 
          onPress={() => mutate()}
        >
          刷新
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardBody className="p-3">
          <div className="flex gap-4 flex-wrap items-end">
            <Input
              label="用户 ID"
              placeholder="按用户筛选"
              value={filters.userId}
              onValueChange={(v) => { setFilters({ ...filters, userId: v }); setPage(1); }}
              className="w-40"
              size="sm"
              variant="bordered"
              startContent={<Search size={14} className="text-default-400" />}
            />
            <Input
              label="渠道 ID"
              placeholder="按渠道筛选"
              value={filters.channelId}
              onValueChange={(v) => { setFilters({ ...filters, channelId: v }); setPage(1); }}
              className="w-40"
              size="sm"
              variant="bordered"
            />
            <Select
              label="状态"
              placeholder="全部状态"
              selectedKeys={filters.status ? [filters.status] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string || "";
                setFilters({ ...filters, status: selected });
                setPage(1);
              }}
              className="w-40"
              size="sm"
              variant="bordered"
            >
              {statusOptions.map((opt) => (
                <SelectItem key={opt.key}>{opt.label}</SelectItem>
              ))}
            </Select>
            <div className="flex-1" />
            <div className="flex items-center gap-4 text-small">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="text-default-500">{successCount} 成功</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-danger" />
                <span className="text-default-500">{errorCount} 错误</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Table */}
      <Card className="shadow-sm">
        <CardHeader className="px-4 py-3 border-b border-divider/60">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            <span className="font-semibold">请求历史</span>
            <Chip size="sm" variant="flat">共 {data?.pagination?.total || 0} 条</Chip>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" color="primary" />
            </div>
          ) : (
            <Table aria-label="请求日志列表" removeWrapper>
              <TableHeader>
                <TableColumn>时间</TableColumn>
                <TableColumn>模型</TableColumn>
                <TableColumn align="end">Token</TableColumn>
                <TableColumn align="end">费用</TableColumn>
                <TableColumn align="end">延迟</TableColumn>
                <TableColumn>状态</TableColumn>
                <TableColumn>用户 / 渠道</TableColumn>
              </TableHeader>
              <TableBody emptyContent="暂无日志">
                {(data?.data || []).map((log: Log) => (
                  <TableRow key={log.id} className="hover:bg-default-50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-default-400" />
                        <span className="text-small text-default-600">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Cpu size={14} className="text-primary" />
                        <div>
                          <p className="font-medium font-mono text-small">{log.requestModel}</p>
                          {log.actualModel !== log.requestModel && (
                            <p className="text-tiny text-default-400">→ {log.actualModel}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Zap size={12} className="text-warning" />
                          <span className="font-medium">{log.totalTokens?.toLocaleString()}</span>
                        </div>
                        <p className="text-tiny text-default-400">
                          {log.inputTokens?.toLocaleString()} in / {log.outputTokens?.toLocaleString()} out
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign size={12} className="text-success" />
                          <span className="font-medium">{Number(log.cost).toFixed(6)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        <Chip 
                          size="sm" 
                          variant="flat"
                          color={log.latency < 1000 ? "success" : log.latency < 3000 ? "warning" : "danger"}
                        >
                          {log.latency}ms
                        </Chip>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Chip
                          color={log.status === "success" ? "success" : "danger"}
                          size="sm"
                          variant="dot"
                        >
                          {log.status}
                        </Chip>
                        {log.errorMessage && (
                          <Tooltip content={log.errorMessage}>
                            <p className="max-w-[150px] truncate text-tiny text-danger cursor-help">
                              {log.errorMessage}
                            </p>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-small">
                        <p>用户: <span className="font-medium">{log.userId || "-"}</span></p>
                        <p className="text-default-400">渠道: {log.channelId || "-"}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-small text-default-500">
          显示 {((page - 1) * 50) + 1} - {Math.min(page * 50, data?.pagination?.total || 0)} 条，共 {data?.pagination?.total || 0} 条记录
        </p>
        {totalPages > 1 && (
          <Pagination
            total={totalPages}
            page={page}
            onChange={setPage}
            showControls
            color="primary"
            size="sm"
            classNames={{
              cursor: "shadow-md",
            }}
          />
        )}
      </div>
    </div>
  );
}
