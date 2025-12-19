// Usage: <FormField label="Name" description="Hint"><Input /></FormField>
import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

type FormFieldProps = {
  label?: string;
  description?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
};

function FormField({ label, description, required, htmlFor, className, children }: FormFieldProps) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor} className="flex items-center gap-1 text-sm font-medium">
          {label}
          {required ? <span className="text-destructive">*</span> : null}
        </Label>
      ) : null}
      {children}
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export { FormField };
