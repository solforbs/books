import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex min-h-tap items-center justify-center gap-2 rounded-lg px-5 text-base font-semibold " +
    "transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40 " +
    "disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white hover:bg-brand-dark",
        secondary: "border-2 border-brand bg-white text-brand-dark hover:bg-brand-light",
        ghost: "text-brand-dark underline-offset-4 hover:underline",
        danger: "bg-red-700 text-white hover:bg-red-800",
      },
      size: {
        default: "",
        sm: "min-h-10 px-3 text-sm",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "default", block: false },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
