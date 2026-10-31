import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Native select: the phone's own picker is the most familiar and accessible choice. */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "block min-h-tap rounded-lg border-2 border-slate-400 bg-white px-3 text-base text-slate-900",
        "focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/30",
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = "Select";
