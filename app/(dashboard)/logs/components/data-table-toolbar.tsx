"use client";

import { Table } from "@tanstack/react-table";
import { RefreshCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "./data-table-view-options";

import { statuses } from "../data/data";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  onRefresh?: () => void;
}

export function DataTableToolbar<TData>({ table, onRefresh }: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder="Filter logs..."
          value={(table.getColumn("requestModel")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("requestModel")?.setFilterValue(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {table.getColumn("status") ? (
          <DataTableFacetedFilter column={table.getColumn("status")} title="Status" options={statuses} />
        ) : null}
        {isFiltered ? (
          <Button variant="ghost" size="sm" onClick={() => table.resetColumnFilters()}>
            Reset
            <X />
          </Button>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <DataTableViewOptions table={table} />
        <Button size="sm" onClick={onRefresh} className="gap-2" disabled={!onRefresh}>
          <RefreshCw className="size-4" />
          刷新
        </Button>
      </div>
    </div>
  );
}

