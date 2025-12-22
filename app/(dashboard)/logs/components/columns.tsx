import { ColumnDef } from "@tanstack/react-table";

import { statuses } from "../data/data";
import type { Log } from "../data/schema";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";

export type LogRow = Log;

export const columns: ColumnDef<LogRow>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
    cell: ({ row }) => <div className="w-[90px] font-mono text-xs">{row.getValue("id")}</div>,
    enableSorting: false,
    enableHiding: false,
    meta: { title: "ID" },
  },
  {
    accessorKey: "requestModel",
    header: ({ column }) => <DataTableColumnHeader column={column} title="模型" />,
    cell: ({ row }) => {
      const requestModel = (row.getValue("requestModel") as string | null) ?? "-";
      const actualModel = (row.original.actualModel as string | null) ?? requestModel;
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs font-medium">{requestModel}</span>
          {actualModel !== requestModel ? <span className="text-muted-foreground text-xs">→ {actualModel}</span> : null}
        </div>
      );
    },
    meta: { title: "模型" },
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="状态" />,
    cell: ({ row }) => {
      const status = statuses.find((s) => s.value === row.getValue("status"));
      if (!status) {
        return null;
      }
      const Icon = status.icon;

      return (
        <div className="flex w-[60px] items-center justify-center">
          {Icon ? (
            <Icon className={status.value === "error" ? "text-destructive size-4" : "text-muted-foreground size-4"} />
          ) : null}
          <span className="sr-only">{status.value}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    meta: { title: "状态" },
  },
  {
    accessorKey: "totalTokens",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Token" align="right" />,
    cell: ({ row }) => {
      const tokens = (row.getValue("totalTokens") as number | null) ?? 0;
      return <div className="w-[120px] text-right tabular-nums">{tokens.toLocaleString()}</div>;
    },
    meta: { title: "Token" },
  },
  {
    accessorKey: "cost",
    header: ({ column }) => <DataTableColumnHeader column={column} title="费用" align="right" />,
    cell: ({ row }) => {
      const raw = row.getValue("cost") as string | null;
      const value = Number(raw ?? NaN);
      return (
        <div className="w-[120px] text-right font-mono text-xs tabular-nums">
          {Number.isFinite(value) ? value.toFixed(4) : "-"}
        </div>
      );
    },
    meta: { title: "费用" },
  },
  {
    accessorKey: "latency",
    header: ({ column }) => <DataTableColumnHeader column={column} title="延迟(ms)" align="right" />,
    cell: ({ row }) => <div className="w-[120px] text-right tabular-nums">{row.getValue("latency") ?? "-"}</div>,
    meta: { title: "延迟(ms)" },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="时间" />,
    cell: ({ row }) => <div className="w-[190px] text-sm">{new Date(row.getValue("createdAt")).toLocaleString()}</div>,
    meta: { title: "时间" },
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
    meta: { title: "操作" },
  },
];
