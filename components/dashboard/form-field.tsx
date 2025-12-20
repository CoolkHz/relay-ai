// Usage: <FormField label="Name" description="Hint" error="Error message"><Input /></FormField>
import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

type FormFieldProps = {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  reserveDescriptionSpace?: boolean;
  children: React.ReactNode;
};

function FormField({
  label,
  description,
  error,
  required,
  htmlFor,
  className,
  reserveDescriptionSpace,
  children,
}: FormFieldProps) {
  const showDescription = Boolean(description) || Boolean(error) || reserveDescriptionSpace;
  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor} className="flex items-center gap-1 text-sm font-medium">
          {label}
          {required ? <span className="text-destructive">*</span> : null}
        </Label>
      ) : null}
      {children}
      {showDescription ? (
        <p
          className={cn(
            "text-xs",
            error ? "text-destructive" : "text-muted-foreground",
            reserveDescriptionSpace && !error && !description && "min-h-4"
          )}
          aria-hidden={!description && !error}
        >
          {error || description}
        </p>
      ) : null}
    </div>
  );
}

export { FormField };
