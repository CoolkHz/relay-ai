// Usage: wrap app with <ConfirmDialogProvider> and call useConfirm() to open dialogs.
"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmDialogOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
};

type ConfirmDialogState = ConfirmDialogOptions & {
  open: boolean;
};

const ConfirmDialogContext = React.createContext<((options: ConfirmDialogOptions) => Promise<boolean>) | null>(
  null
);

function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ConfirmDialogState>({ open: false });
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback((options: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ open: true, ...options });
    });
  }, []);

  const handleClose = React.useCallback(
    (result: boolean) => {
      if (!state.open || !resolveRef.current) return;
      resolveRef.current(result);
      resolveRef.current = null;
      setState({ open: false });
    },
    [state]
  );

  const title = state.title || "确认操作";
  const description = state.description || "此操作不可撤销，是否继续？";
  const confirmText = state.confirmText || "确认";
  const cancelText = state.cancelText || "取消";
  const confirmVariant = state.variant === "destructive" ? "destructive" : "default";

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <Dialog open={state.open} onOpenChange={(open) => (!open ? handleClose(false) : null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>
              {cancelText}
            </Button>
            <Button variant={confirmVariant} onClick={() => handleClose(true)}>
              {confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmDialogContext.Provider>
  );
}

function useConfirm() {
  const context = React.useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error("useConfirm must be used within ConfirmDialogProvider");
  }
  return context;
}

export { ConfirmDialogProvider, useConfirm };
