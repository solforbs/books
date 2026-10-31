import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const alertVariants = cva("rounded-lg border-2 px-4 py-3 text-base", {
  variants: {
    variant: {
      error: "border-red-700 bg-red-50 text-red-900",
      success: "border-green-700 bg-green-50 text-green-900",
      info: "border-sky-700 bg-sky-50 text-sky-900",
    },
  },
  defaultVariants: { variant: "info" },
});

export interface AlertProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

/** Errors are announced immediately to screen readers; other messages politely. */
export function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}
