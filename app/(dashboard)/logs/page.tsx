"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import { ErrorState } from "@/components/dashboard/error-state";
import { columns, type LogRow } from "./components/columns";
import { DataTable } from "./components/data-table";
import { jsonFetcher } from "@/lib/utils/fetcher";

type LogsResponse = {
  data: LogRow[];
  pagination: { page: number; limit: number; total: number };
};

export default function LogsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const key = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    return `/api/admin/logs?${params.toString()}`;
  }, [page, pageSize]);

  const { data, isLoading, mutate, error } = useSWR<LogsResponse>(key, (url: string) => jsonFetcher<LogsResponse>(url));

  const total = data?.pagination?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pagination = useMemo(() => ({ pageIndex: page - 1, pageSize }), [page, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clamp page when total decreases to avoid empty views.
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="h-full flex-1 flex-col gap-8 p-8 md:flex">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">请求日志</h2>
          <p className="text-muted-foreground">这里是本月的请求日志列表。</p>
        </div>
      </div>

      {error ? (
        <ErrorState title="加载日志失败" message={error} onRetry={() => mutate()} />
      ) : (
        <DataTable
          columns={columns}
          isLoading={isLoading}
          data={data?.data ?? []}
          pageCount={totalPages}
          pagination={pagination}
          onPaginationChange={(updater) => {
            const next = typeof updater === "function" ? updater(pagination) : updater;

            if (next.pageSize !== pagination.pageSize) {
              setPageSize(next.pageSize);
              setPage(1);
              return;
            }

            if (next.pageIndex !== pagination.pageIndex) {
              setPage(next.pageIndex + 1);
            }
          }}
          onRefresh={() => mutate()}
        />
      )}
    </div>
  );
}
