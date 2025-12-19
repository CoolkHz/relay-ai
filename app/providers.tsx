"use client";

// Usage: wrap layout to enable themes and tooltips.
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light">
      <TooltipProvider delayDuration={200}>
        {children}
      </TooltipProvider>
    </NextThemesProvider>
  );
}
