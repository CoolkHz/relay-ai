"use client";

import { Row } from "@tanstack/react-table";
import { Copy, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Log } from "../data/schema";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}

export function DataTableRowActions<TData>({ row }: DataTableRowActionsProps<TData>) {
  const log = row.original as unknown as Log;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="data-[state=open]:bg-muted size-8">
          <MoreHorizontal />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuItem onClick={() => copyToClipboard(String(log.id))}>
          <Copy />
          复制日志 ID
          <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
        </DropdownMenuItem>
        {log.errorMessage ? (
          <DropdownMenuItem onClick={() => copyToClipboard(log.errorMessage ?? "")}>
            <Copy />
            复制错误信息
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            copyToClipboard(
              JSON.stringify(
                {
                  id: log.id,
                  requestModel: log.requestModel,
                  actualModel: log.actualModel,
                  status: log.status,
                  createdAt: log.createdAt,
                },
                null,
                2
              )
            )
          }
        >
          <Copy />
          复制摘要 JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

