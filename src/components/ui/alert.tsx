import * as React from "react";
import { cn } from "@/lib/utils";

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { tone?: "info" | "warning" | "success" | "danger" }
>(({ className, tone = "info", ...props }, ref) => {
  const tones = {
    info: "border-blue-200 bg-blue-50 text-blue-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    danger: "border-red-200 bg-red-50 text-red-800",
  };

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm leading-relaxed",
        tones[tone],
        className
      )}
      {...props}
    />
  );
});
Alert.displayName = "Alert";

export { Alert };
