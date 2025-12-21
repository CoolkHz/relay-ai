// Usage: <ChartContainer config={config} className="h-[300px]"><BarChart data={data}>...</BarChart></ChartContainer>
"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from "recharts";

import { cn } from "@/lib/utils/cn";

type ChartConfigItem = {
  label: string;
  color: string;
};

type ChartConfig = Record<string, ChartConfigItem>;

const ChartConfigContext = React.createContext<ChartConfig | null>(null);

function ChartContainer({
  config,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  config: ChartConfig;
  children: React.ReactElement;
}) {
  const style = React.useMemo(() => {
    const entries = Object.entries(config).map(([key, item]) => [`--color-${key}`, item.color] as const);
    return Object.fromEntries(entries) as React.CSSProperties;
  }, [config]);

  return (
    <ChartConfigContext.Provider value={config}>
      <div className={cn("w-full", className)} style={style} {...props}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartConfigContext.Provider>
  );
}

function useChartConfig() {
  const config = React.useContext(ChartConfigContext);
  if (!config) throw new Error("Chart components must be used within <ChartContainer />");
  return config;
}

function ChartTooltip({
  cursor = false,
  ...props
}: React.ComponentProps<typeof RechartsTooltip>) {
  return (
    <RechartsTooltip
      cursor={cursor}
      content={<ChartTooltipContent />}
      {...props}
    />
  );
}

function ChartLegend(props: React.ComponentProps<typeof RechartsLegend>) {
  return <RechartsLegend content={<ChartLegendContent />} {...props} />;
}

type ChartTooltipContentProps = {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: unknown }>;
  label?: unknown;
};

function ChartTooltipContent({
  active,
  payload,
  label,
}: ChartTooltipContentProps) {
  const config = useChartConfig();
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[180px] rounded-lg border bg-background p-2 text-xs shadow-md">
      <div className="mb-2 text-xs font-medium text-muted-foreground">{String(label ?? "")}</div>
      <div className="space-y-1">
        {payload.map((item: { dataKey?: string | number; value?: unknown }) => {
          const key = String(item.dataKey ?? "");
          const labelText = config[key]?.label ?? key;
          const color = config[key]?.color ?? "hsl(var(--foreground))";
          const value = item.value;
          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-muted-foreground">{labelText}</span>
              </div>
              <span className="font-medium text-foreground">{value === undefined ? "-" : String(value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartLegendContent({ payload }: { payload?: Array<{ dataKey?: string; value?: string }> }) {
  const config = useChartConfig();
  if (!payload?.length) return null;

  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {payload.map((item) => {
        const key = String(item.dataKey ?? "");
        const labelText = config[key]?.label ?? item.value ?? key;
        const color = config[key]?.color ?? "hsl(var(--foreground))";
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span>{labelText}</span>
          </div>
        );
      })}
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartLegend };
