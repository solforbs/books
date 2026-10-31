import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "block min-h-tap w-full rounded-lg border-2 border-slate-400 bg-white px-3 text-base text-slate-900",
      "placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/30",
      "aria-[invalid=true]:border-red-700",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
