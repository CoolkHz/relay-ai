// Usage: <ErrorState title="加载失败" message={error} onRetry={() => mutate()} />
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ErrorStateProps = {
  title?: string;
  message?: unknown;
  onRetry?: () => void;
  className?: string;
};

function toMessage(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function ErrorState({ title = "加载失败", message, onRetry, className }: ErrorStateProps) {
  const text = toMessage(message) || "请求失败，请稍后重试";
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-destructive">{title}</CardTitle>
        <CardDescription>{text}</CardDescription>
        {onRetry ? (
          <div className="pt-2">
            <Button variant="secondary" onClick={onRetry}>
              重试
            </Button>
          </div>
        ) : null}
      </CardHeader>
    </Card>
  );
}

export { ErrorState };

