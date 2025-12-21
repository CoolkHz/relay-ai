// Usage: <ResponsiveTable data={rows} columns={columns} getRowId={(row) => row.id} emptyState={<Empty />} />
"use client";

import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";
import { SlidersHorizontal, ArrowUpDown } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";

type ColumnAlign = "left" | "center" | "right";

type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: ColumnAlign;
  className?: string;
  hideOnMobile?: boolean;
  mobileLabel?: string;
  sortValue?: (row: T) => unknown;
  enableSorting?: boolean;
  hideInColumnMenu?: boolean;
};

type ResponsiveTableProps<T> = {
  data: T[];
  columns: Array<Column<T>>;
  getRowId: (row: T, index: number) => string | number;
  emptyState: React.ReactNode;
  renderMobileCard?: (row: T) => React.ReactNode;
  tableClassName?: string;
  tableLabel?: string;
  enableColumnVisibility?: boolean;
  isLoading?: boolean;
  skeletonRows?: number;
};

function alignClassName(align?: ColumnAlign) {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

function getColumnLabel<T>(column: Column<T>) {
  if (typeof column.mobileLabel === "string" && column.mobileLabel.trim()) return column.mobileLabel;
  if (typeof column.header === "string" && column.header.trim()) return column.header;
  return column.key;
}

function ResponsiveTable<T>({
  data,
  columns,
  getRowId,
  emptyState,
  renderMobileCard,
  tableClassName,
  tableLabel,
  enableColumnVisibility,
  isLoading,
  skeletonRows = 6,
}: ResponsiveTableProps<T>) {
  const hasData = data.length > 0;
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const tableColumns = React.useMemo<ColumnDef<T>[]>(() => {
    return columns.map((column) => {
      const sortingEnabled = Boolean(column.enableSorting ?? column.sortValue);
      const columnDef: ColumnDef<T> = {
        id: column.key,
        header: () => column.header,
        cell: ({ row }) => column.cell(row.original),
        enableSorting: sortingEnabled,
        accessorFn: sortingEnabled ? (row) => column.sortValue?.(row) : undefined,
        meta: { align: column.align, className: column.className, label: getColumnLabel(column) },
        enableHiding: !(column.hideInColumnMenu ?? false),
      };
      return columnDef;
    });
  }, [columns]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table hooks are safe here and the table instance is not memoized/passed into memoized hooks.
  const table = useReactTable({
    data,
    columns: tableColumns,
    getRowId: (row, index) => String(getRowId(row, index) ?? index),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
  });

  return (
    <>
      <div className="hidden md:block">
        {isLoading ? (
          <Table className={tableClassName} aria-label={tableLabel}>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(alignClassName(column.align), column.className)}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(alignClassName(column.align), column.className)}
                    >
                      <Skeleton className="h-4 w-full max-w-[240px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : hasData ? (
          <>
            {enableColumnVisibility ? (
              <div className="flex items-center justify-end pb-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      列
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>显示列</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {table
                      .getAllLeafColumns()
                      .filter((col) => col.getCanHide())
                      .map((col) => (
                        <DropdownMenuCheckboxItem
                          key={col.id}
                          checked={col.getIsVisible()}
                          onCheckedChange={(value) => col.toggleVisibility(Boolean(value))}
                        >
                          {String((col.columnDef.meta as { label?: string } | undefined)?.label ?? col.id)}
                        </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : null}

            <Table className={tableClassName} aria-label={tableLabel}>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const meta = header.column.columnDef.meta as { align?: ColumnAlign; className?: string } | undefined;
                      return (
                        <TableHead
                          key={header.id}
                          className={cn(alignClassName(meta?.align), meta?.className)}
                        >
                          {header.isPlaceholder ? null : header.column.getCanSort() ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="-ml-3 h-8 gap-2 px-3"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as { align?: ColumnAlign; className?: string } | undefined;
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(alignClassName(meta?.align), meta?.className)}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        ) : (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            {emptyState}
          </div>
        )}
      </div>
      <div className="md:hidden">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: Math.min(4, skeletonRows) }).map((_, index) => (
              <Card key={index} className="border border-border/60">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : hasData ? (
          <div className="space-y-3">
            {data.map((row, index) => {
              const content = renderMobileCard ? (
                renderMobileCard(row)
              ) : (
                <Card>
                  <CardContent className="space-y-2 p-4 text-sm">
                    {columns
                      .filter((column) => !column.hideOnMobile)
                      .map((column) => (
                        <div key={column.key} className="flex items-start justify-between gap-4">
                          <span className="text-xs text-muted-foreground">
                            {column.mobileLabel ||
                              (typeof column.header === "string" ? column.header : "")}
                          </span>
                          <span className={cn("text-right", alignClassName(column.align), column.className)}>
                            {column.cell(row)}
                          </span>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              );

              return <React.Fragment key={getRowId(row, index)}>{content}</React.Fragment>;
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            {emptyState}
          </div>
        )}
      </div>
    </>
  );
}

export { ResponsiveTable };
