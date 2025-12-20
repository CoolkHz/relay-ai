"use client";

// Usage: wrap layout to enable themes, tooltips, and toast notifications.
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "sonner";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light">
      <TooltipProvider delayDuration={200}>
        <ConfirmDialogProvider>
          {children}
          <Toaster richColors position="top-center" />
        </ConfirmDialogProvider>
      </TooltipProvider>
    </NextThemesProvider>
  );
}
