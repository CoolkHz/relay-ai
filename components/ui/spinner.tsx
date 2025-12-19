// Usage: <Spinner size="lg" />
import * as React from "react";

import { cn } from "@/lib/utils/cn";

type SpinnerSize = "sm" | "md" | "lg";

const sizeMap: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

function Spinner({ size = "md", className }: { size?: SpinnerSize; className?: string }) {
  return (
    <div
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-muted border-t-primary",
        sizeMap[size],
        className
      )}
    />
  );
}

export { Spinner };
