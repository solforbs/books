import type { VariantProps } from "class-variance-authority";
import { Link, type LinkProps } from "react-router";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./ui/button";

type LinkButtonProps = LinkProps & VariantProps<typeof buttonVariants>;

/** A link that looks like a button, for moving to another screen (a real link, not a script). */
export function LinkButton({ className, variant, size, block, ...props }: LinkButtonProps) {
  return <Link className={cn(buttonVariants({ variant, size, block }), className)} {...props} />;
}
