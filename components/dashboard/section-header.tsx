// Usage: <SectionHeader title="Title" icon={<Icon />} count={3} actions={<Button />} />
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

type SectionHeaderProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  count?: number | string;
  actions?: React.ReactNode;
  className?: string;
};

function SectionHeader({ title, description, icon, count, actions, className }: SectionHeaderProps) {
  const showCount = count !== undefined && count !== null;

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex items-center gap-3">
        {icon ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            {icon}
          </div>
        ) : null}
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {showCount ? (
          <Badge variant="secondary" className="ml-0 sm:ml-2">
            {count}
          </Badge>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export { SectionHeader };
