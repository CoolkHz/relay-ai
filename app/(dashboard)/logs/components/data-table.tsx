"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
  type PaginationState,
} from "@tanstack/react-table";

import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  pageCount: number;
  pagination: PaginationState;
  onPaginationChange: (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => void;
  onRefresh?: () => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  pageCount,
  pagination,
  onPaginationChange,
  onRefresh,
}: DataTableProps<TData, TValue>) {
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table hooks are safe here and the table instance is not memoized/passed into memoized hooks.
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination,
    },
    manualPagination: true,
    pageCount,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar table={table} onRefresh={onRefresh} />
      <div className="rounded-md border bg-card text-card-foreground">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {table.getAllLeafColumns().map((column) => (
                    <TableCell key={column.id}>
                      <Skeleton className="h-4 w-full max-w-[240px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
