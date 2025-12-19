// Usage: <ResponsiveTable data={rows} columns={columns} getRowId={(row) => row.id} emptyState={<Empty />} />
import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";

type ColumnAlign = "left" | "center" | "right";

type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: ColumnAlign;
  className?: string;
  hideOnMobile?: boolean;
  mobileLabel?: string;
};

type ResponsiveTableProps<T> = {
  data: T[];
  columns: Array<Column<T>>;
  getRowId: (row: T) => string | number;
  emptyState: React.ReactNode;
  renderMobileCard?: (row: T) => React.ReactNode;
  tableClassName?: string;
  tableLabel?: string;
};

function alignClassName(align?: ColumnAlign) {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

function ResponsiveTable<T>({
  data,
  columns,
  getRowId,
  emptyState,
  renderMobileCard,
  tableClassName,
  tableLabel,
}: ResponsiveTableProps<T>) {
  const hasData = data.length > 0;

  return (
    <>
      <div className="hidden md:block">
        {hasData ? (
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
              {data.map((row) => (
                <TableRow key={getRowId(row)}>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(alignClassName(column.align), column.className)}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            {emptyState}
          </div>
        )}
      </div>
      <div className="md:hidden">
        {hasData ? (
          <div className="space-y-3">
            {data.map((row) => {
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

              return <React.Fragment key={getRowId(row)}>{content}</React.Fragment>;
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
