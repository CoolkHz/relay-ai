// Usage: <Pagination total={5} page={1} onChange={setPage} />
import * as React from "react";

import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

type PaginationProps = {
  total: number;
  page: number;
  onChange: (page: number) => void;
  showControls?: boolean;
  className?: string;
};

function buildPageRange(current: number, total: number) {
  const rangeSize = 5;
  let start = Math.max(1, current - 2);
  const end = Math.min(total, start + rangeSize - 1);
  start = Math.max(1, end - rangeSize + 1);
  const pages: number[] = [];
  for (let i = start; i <= end; i += 1) pages.push(i);
  return { pages, start, end };
}

function Pagination({ total, page, onChange, showControls = true, className }: PaginationProps) {
  if (total <= 1) return null;

  const { pages, start, end } = buildPageRange(page, total);

  return (
    <nav className={cn("flex items-center gap-2", className)} aria-label="分页">
      {showControls && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          上一页
        </Button>
      )}
      {start > 1 && (
        <>
          <Button variant="ghost" size="sm" onClick={() => onChange(1)}>
            1
          </Button>
          {start > 2 && <span className="text-sm text-muted-foreground">...</span>}
        </>
      )}
      {pages.map((p) => (
        <Button
          key={p}
          variant={p === page ? "default" : "ghost"}
          size="sm"
          onClick={() => onChange(p)}
        >
          {p}
        </Button>
      ))}
      {end < total && (
        <>
          {end < total - 1 && <span className="text-sm text-muted-foreground">...</span>}
          <Button variant="ghost" size="sm" onClick={() => onChange(total)}>
            {total}
          </Button>
        </>
      )}
      {showControls && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(Math.min(total, page + 1))}
          disabled={page >= total}
        >
          下一页
        </Button>
      )}
    </nav>
  );
}

export { Pagination };
